import { execFile } from 'node:child_process'

export type ObsidianDailyTodoAxSnapshot = {
  bundleId: string
  appName: string
  windowTitle: string
  role: string
  value: string
}

const SEP = '|@@@|'
const TIMEOUT_MS = 3000
let lastErrorLogAt = 0

const SCRIPT = `set sep to "${SEP}"

on getVal(elem)
	tell application "System Events"
		try
			set v to value of attribute "AXValue" of elem
			if v is not missing value then return v as text
		end try
	end tell
	return ""
end getVal

on getRole(elem)
	tell application "System Events"
		try
			return value of attribute "AXRole" of elem as text
		end try
	end tell
	return ""
end getRole

on getKids(elem)
	tell application "System Events"
		try
			set k to value of attribute "AXChildren" of elem
			if k is missing value then return {}
			return k
		end try
	end tell
	return {}
end getKids

on findText(rootElem, maxNodes)
	set queue to {rootElem}
	set visited to 0
	repeat while (count of queue) > 0
		if visited >= maxNodes then exit repeat
		set cur to item 1 of queue
		if (count of queue) > 1 then
			set queue to items 2 thru -1 of queue
		else
			set queue to {}
		end if
		set visited to visited + 1
		set r to my getRole(cur)
		if r is "AXTextArea" or r is "AXTextField" or r is "AXComboBox" or r is "AXStaticText" then
			set v to my getVal(cur)
			if v is not "" then return v
		end if
		set kids to my getKids(cur)
		repeat with k in kids
			set queue to queue & {(contents of k)}
		end repeat
	end repeat
	return ""
end findText

tell application "System Events"
	try
		set p to first application process whose frontmost is true
		set bid to ""
		try
			set bid to bundle identifier of p
		end try
		set pname to ""
		try
			set pname to name of p
		end try
		set winTitle to ""
		try
			set winTitle to name of front window of p
		end try
		set roleStr to ""
		set valStr to ""
		try
			set fe to value of attribute "AXFocusedUIElement" of p
			set roleStr to my getRole(fe)
			set valStr to my getVal(fe)
			if valStr is "" then
				set valStr to my findText(fe, 120)
			end if
		end try
		if valStr is "" then
			try
				set valStr to my findText(front window of p, 200)
			end try
		end if
		return bid & sep & pname & sep & winTitle & sep & roleStr & sep & valStr
	on error errMsg number errNum
		return "ERROR" & sep & errNum & sep & errMsg & sep & "" & sep & ""
	end try
end tell`

export function readObsidianDailyTodoAxSnapshot(): Promise<ObsidianDailyTodoAxSnapshot | null> {
  return new Promise((resolve) => {
    const child = execFile(
      '/usr/bin/osascript',
      ['-e', SCRIPT],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const now = Date.now()
          if (now - lastErrorLogAt > 5000) {
            lastErrorLogAt = now
            console.warn(
              `[obsidian-ai-capture][ax] osascript failed: ${error.message} | stderr=${(stderr || '').slice(0, 200)}`
            )
          }
          resolve(null)
          return
        }
        const raw = (stdout || '').replace(/\n$/, '')
        if (!raw) {
          resolve(null)
          return
        }
        const parts = raw.split(SEP)
        if (parts.length < 5) {
          resolve(null)
          return
        }
        resolve({
          bundleId: parts[0] || 'unknown',
          appName: parts[1] || 'Unknown',
          windowTitle: parts[2] || '',
          role: parts[3] || '',
          value: parts.slice(4).join(SEP)
        })
      }
    )
    child.on('error', () => resolve(null))
  })
}
