import { describe, expect, it } from 'vitest'

import { parseObsidianDailyTodos } from './obsidian-daily-todo'
import {
  deleteObsidianDailyTodo,
  updateObsidianDailyTodoPriority
} from './obsidian-daily-todo-mutation'

const MARKDOWN = `### 今日任务
#### P1
- [/] parent
  - [ ] child
#### P2
- [x] completed
`

describe('Obsidian daily todo mutations', () => {
  it('moves an existing todo block to another priority without changing its status', () => {
    const todo = parseObsidianDailyTodos(MARKDOWN)[0]
    const updated = updateObsidianDailyTodoPriority(MARKDOWN, todo, 'P2')

    expect(updated).toContain('#### P2\n- [x] completed\n\n- [/] parent\n  - [ ] child')
    expect(parseObsidianDailyTodos(updated ?? '')[1]).toMatchObject({
      text: 'parent',
      status: 'in-progress',
      priority: 'P2'
    })
  })

  it('deletes a todo and its nested tasks', () => {
    const todo = parseObsidianDailyTodos(MARKDOWN)[0]
    const updated = deleteObsidianDailyTodo(MARKDOWN, todo)

    expect(updated).not.toContain('parent')
    expect(updated).not.toContain('child')
    expect(updated).toContain('- [x] completed')
  })

  it('rejects an ambiguous stale task instead of mutating the wrong row', () => {
    const todo = parseObsidianDailyTodos('- [ ] same\n')[0]
    const changedOnDisk = 'intro\n- [ ] same\n- [ ] same\n'

    expect(deleteObsidianDailyTodo(changedOnDisk, todo)).toBeNull()
    expect(updateObsidianDailyTodoPriority(changedOnDisk, todo, 'P2')).toBeNull()
  })
})
