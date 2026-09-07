# Capybara Child Game Builder

这是一个专门服务于 **Capybara Bubble Tea Catcher（水豚奶茶接物游戏）** 的 Codex Skill。

它用于把孩子的昵称、账号、角色图片、角色动作、召唤技能和技能特效接入这一个游戏，
不适用于跑酷、躲障碍或其他类型的游戏。

## 安装

把本仓库目录复制到 Codex 的 skills 目录：

```text
<CODEX_HOME>/skills/capybara-child-game-builder/
```

然后在对话中使用：

```text
使用 $capybara-child-game-builder，把这个孩子的角色和技能接入游戏。
```

默认只改本地项目。只有明确要求部署时，才进入线上流程。

## 目录

- `SKILL.md`：Skill 主说明
- `references/child-role-form.md`：孩子角色和技能采集表
- `references/implementation-contract.md`：当前游戏的实现契约
- `agents/openai.yaml`：Codex 界面元数据
