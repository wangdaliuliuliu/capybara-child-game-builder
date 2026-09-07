# Capybara Child Game Builder

这是一个专门服务于 **Capybara Bubble Tea Catcher（水豚奶茶接物游戏）** 的 Codex Skill，
同时附带一份可以直接运行的基础游戏源码。它不适用于跑酷、躲障碍或其他类型的游戏。

## 拉取与运行游戏

```bash
git clone https://github.com/wangdaliuliuliu/capybara-child-game-builder.git
cd capybara-child-game-builder/game
npm start
```

然后访问：`http://127.0.0.1:8001/index.html`

首次启动会在 `game/data/accounts.json` 生成运行时账号和排行榜文件。这个文件不会提交到仓库；
公开试玩版的示例密码写在游戏前端中，正式部署前应按自己的需要修改。

## 安装 Skill

把仓库根目录复制到 Codex 的 skills 目录：

```text
<CODEX_HOME>/skills/capybara-child-game-builder/
```

然后在对话中使用：

```text
使用 $capybara-child-game-builder，把这个孩子的角色和技能接入游戏。
```

默认只改本地项目。只有明确要求部署时，才进入线上流程。

## 目录

- `SKILL.md`：Skill 主说明和工作流程
- `references/child-role-form.md`：孩子角色和技能采集表
- `references/implementation-contract.md`：当前游戏的实现契约
- `agents/openai.yaml`：Codex 界面元数据
- `game/`：可运行的水豚奶茶接物游戏源码和角色素材
