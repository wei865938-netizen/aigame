# AIGAME 游戏机

一套手机点开就玩的网页小游戏,不用安装。整个 `Desktop\aigame` 文件夹就是 GitHub 仓库 `wei865938-netizen/aigame` 的工作目录,推上去就是线上版本。

## 直接玩(发朋友用这个)

- 游戏机首页(所有游戏都在这):https://wei865938-netizen.github.io/aigame/
- 单个游戏直达:
  - 寿司消消乐 · 推箱子:https://wei865938-netizen.github.io/aigame/sushi-sokoban/
  - 水果忍者:https://wei865938-netizen.github.io/aigame/fruit/
  - 愤怒的小鸟:https://wei865938-netizen.github.io/aigame/birds/
  - 神庙逃亡:https://wei865938-netizen.github.io/aigame/temple/
  - 滑雪大冒险:https://wei865938-netizen.github.io/aigame/ski/
  - 割绳子:https://wei865938-netizen.github.io/aigame/rope/
- 电脑上双击任意 `index.html` 也能玩(有键盘操作)。
- Claude Artifact 备用链接(只有寿司+推箱子,国内经常打不开):https://claude.ai/code/artifact/8958317b-4388-4507-9910-3a30e203d196

## 目录

```
aigame/
  index.html          游戏机首页(游戏列表)
  common/shell.css    公共壳:手机机身、HUD、软键、对话框
  common/shell.js     公共工具:存档、对话框、画布适配、主循环、特效
  common/matter.min.js  Matter.js 0.20 物理引擎(愤怒的小鸟用,已下载到本地)
  sushi-sokoban/      寿司消消乐 + 推箱子(单文件,像素风)
  fruit/  birds/  temple/  ski/  rope/   其余五个游戏,各一个 index.html
  sushi-sokoban/tools/  校验脚本(见下)
```

## 玩法

- **寿司消消乐**:8×8、6 种寿司,点两个相邻的交换或直接滑动,三连消除;分数到目标过关,时间条走完结束,消除补时间,提示条蓄满自动指路。
- **推箱子**:34 关由易到难,滑动或按方向键走,按住连续走,中间键撤销,支持选关,进度自动存。
- **水果忍者**:手指划过水果切开,一刀 3 个以上有连斩加分,切到炸弹结束,漏掉 3 个结束。
- **愤怒的小鸟**:按住小鸟往后拉、松手发射,打倒所有绿猪过关;木头、玻璃、石头硬度不同;15 关。
- **神庙逃亡**:三条道跑酷,左右滑换道、上滑跳过木栏、下滑铲过横梁、金币 +10,越跑越快。
- **滑雪大冒险**:按住起跳,空中按住后空翻(每圈 +100),落地角度太歪会摔,雪崩追上就结束;石头要跳过。
- **割绳子**:划过绳子割断,让糖果落进小怪兽嘴里,顺路吃星星;泡泡会带着糖果上浮,点一下戳破;12 关。
- **中国象棋**:人机对弈。点自己的子再点目标;可悔棋、选难度(简单/普通/困难)、执红或执黑。AI 是 alpha-beta 搜索 + 子力位置表,困难档每步约 2 秒,在后台线程里算,不卡界面。
- **五子棋**:人机对弈,15×15。点一下选点、再点一次落子;可悔棋、选难度、选先后手。AI 按棋型评分,困难档带浅层搜索。
- **羊了个羊**:三消叠牌。点没被压住的牌进 7 格木槽,凑齐 3 张同图案消掉,槽满即输,消完过关;两侧有横向叠放条;道具移出/撤销/洗牌每关各一次。关卡用“自下而上倒推分配图案”生成,每一关都保证有解,洗牌也保持有解;`node tools/test-sheep.mjs` 会回放正解验证。第 1 关 5 种图案 30 张,第 5 关起 12 种 120 张以上。
- **智能脑王**:单人闯关答题。6 个分类(古诗词、生活常识、文学历史、科普自然、影视娱乐、脑筋急转弯),每关 10 题、每题 20 秒,选完立刻显示对错和解析,答完看结算(得分、正确数、用时、连对),可重玩、下一关或换分类,结算后弹香蕉。题目做完一轮才会重复。题库在 `quiz/questions.js`,格式 `[题目, 正确答案, [错误选项×3], 难度1-3, 解析]`,正确答案固定写第二项,显示时会打乱;加题后跑 `node tools/test-quiz.mjs` 检查格式。

## 更新线上版本

改完文件后,在 `Desktop\aigame` 目录里:

```
git add -A
git commit -m "更新游戏"
git push
```

推上去一两分钟后 GitHub Pages 自动刷新。

## 校验脚本(在 sushi-sokoban 目录下运行)

```
node tools/test-match3.mjs      # 消消乐引擎 + 像素贴图校验(1000 局随机)
node tools/solve.mjs            # 推箱子全关卡求解,任一关无解则报错
node tools/solve.mjs --write    # 按难度重排关卡并写回(第 1 关固定)
node tools/test-rope.mjs        # 割绳子全关卡穷举割绳时机,确认每关都进得了嘴
node tools/test-birds.mjs       # 愤怒的小鸟全关卡:开局不自塌 + 贪心搜索确认鸟数够打完
node tools/test-xiangqi.mjs     # 象棋:走法数对照公开 perft 数据、将军/照面/马腿/炮架规则、一步杀、自对弈
node tools/test-gomoku.mjs      # 五子棋:成五判定、必挡、活三应对、困难档 vs 简单档
node tools/test-quiz.mjs        # 智能脑王题库:格式、选项不重复、题目不重复、每类题量
node tools/test-sheep.mjs       # 羊了个羊:每关多局按正解回放必须清空,洗牌后同样
node tools/build-artifact.mjs <输出路径>   # 切出寿司+推箱子的 Artifact 片段
```

加推箱子关卡:在 `sushi-sokoban/index.html` 的 `/*LEVELS-START*/ … /*LEVELS-END*/` 里按 XSB 格式追加,跑 `solve.mjs`。
加割绳子关卡:在 `rope/index.html` 的 `/*ROPE-LEVELS-START*/ … /*ROPE-LEVELS-END*/` 里追加(逻辑坐标 360×560),跑 `test-rope.mjs`。

## 已知限制

- 记录只存在当前手机的浏览器里(localStorage),换手机、清缓存会丢。
- 不要用微信直接发 `.html` 文件:iOS 的预览不跑脚本。要发链接。
- 没有音效。
