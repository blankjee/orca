import { describe, expect, it } from 'vitest'

import {
  addObsidianDailyTodo,
  parseObsidianDailyTodos,
  updateObsidianDailyTodoStatus
} from './obsidian-daily-todo'
import { updateObsidianDailyTodoText } from './obsidian-daily-todo-text'

const MARKDOWN = `# 工作计划
## 每日check
- [ ] routine

### 今日任务
#### P1
- [/] parent 09:30
  - [x] child

\`\`\`md
- [ ] ignored
\`\`\`

#### P2
- [-] cancelled
`

describe('Obsidian daily todos', () => {
  it('parses statuses, groups, priorities, nesting, and times outside fenced code', () => {
    const todos = parseObsidianDailyTodos(MARKDOWN)

    expect(todos).toHaveLength(4)
    expect(todos.map((todo) => todo.status)).toEqual([
      'pending',
      'in-progress',
      'completed',
      'cancelled'
    ])
    expect(todos[1]).toMatchObject({
      group: '今日任务',
      priority: 'P1',
      depth: 0,
      timeText: '09:30'
    })
    expect(todos[2]).toMatchObject({ depth: 1, parentId: todos[1].id })
  })

  it('updates only the matching checklist marker while preserving content', () => {
    const todo = parseObsidianDailyTodos(MARKDOWN)[1]
    const updated = updateObsidianDailyTodoStatus(MARKDOWN, todo, 'completed')

    expect(updated).toContain('- [x] parent 09:30')
    expect(updated).toContain('  - [x] child')
  })

  it('rejects ambiguous stale todo rows instead of writing the wrong line', () => {
    const todo = parseObsidianDailyTodos('- [ ] same\n')[0]
    const changedOnDisk = 'intro\n- [ ] same\n- [ ] same\n'

    expect(updateObsidianDailyTodoStatus(changedOnDisk, todo, 'completed')).toBeNull()
  })

  it('updates todo text while preserving its checklist marker and indentation', () => {
    const todo = parseObsidianDailyTodos(MARKDOWN)[2]
    const updated = updateObsidianDailyTodoText(MARKDOWN, todo, 'renamed child')

    expect(updated).toContain('  - [x] renamed child')
  })

  it('ignores checklists inside the work record section', () => {
    const markdown = `${MARKDOWN}\n## 工作记录\n### parent 09:30\n- [ ] note checklist\n`

    expect(parseObsidianDailyTodos(markdown).map((todo) => todo.text)).not.toContain(
      'note checklist'
    )
  })

  it('adds a todo at the end of the selected group and priority section', () => {
    const updated = addObsidianDailyTodo(MARKDOWN, {
      text: 'new task',
      group: '今日任务',
      priority: 'P1'
    })

    expect(updated).toContain('```\n\n- [ ] new task\n#### P2')
  })

  it('creates missing group and priority headings when adding a todo', () => {
    const updated = addObsidianDailyTodo('# Daily\n', {
      text: 'new task',
      group: '今日任务',
      priority: 'P2'
    })

    expect(updated).toContain('### 今日任务\n#### P2\n- [ ] new task')
  })
})
