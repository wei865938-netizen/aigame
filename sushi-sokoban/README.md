# 寿司消消乐 · 推箱子

两个复古像素风的手机小游戏,一个网页文件,点链接就能玩,不用安装。

## 直接玩

- **发朋友用这个**(GitHub Pages,公开仓库 wei865938-netizen/aigame,2026-09-03 上线):
  https://wei865938-netizen.github.io/aigame/sushi-sokoban/
  游戏机首页(以后加的游戏都列在这):https://wei865938-netizen.github.io/aigame/
- Claude Artifact 备用链接:https://claude.ai/code/artifact/8958317b-4388-4507-9910-3a30e203d196 (默认私密,要在分享菜单里开放;国内经常打不开)
- 电脑上直接双击 `index.html` 也能玩(推箱子支持键盘方向键、Z 撤销、R 重开)。
- 直达某个游戏:链接后面加 `#sushi` 或 `#sokoban`。

## 更新线上版本

改完 `index.html` 后,在 `Desktop\aigame` 目录里:

```
git add -A
git commit -m "更新游戏"
git push
```

推上去一两分钟后 GitHub Pages 自动刷新。

## 自己托管(给国内朋友用)

`index.html` 是单文件、零外部依赖,放到任何静态托管上都能跑,任选一种:

1. **Gitee Pages**:新建仓库 → 上传 `index.html` → 服务 → Gitee Pages → 启动(需要实名认证)。
2. **腾讯云 COS / 阿里云 OSS**:建一个公开读的桶 → 上传 `index.html` → 开启"静态网站"功能 → 用它给的访问地址。
3. **Vercel / Netlify**(国外,偶尔慢):把文件夹拖进 Netlify Drop 或 Vercel 即可。

拿到 `https://.../index.html` 之后,直接把链接发到微信,朋友在微信内置浏览器里就能玩。

## 玩法

- **寿司消消乐**:8×8 盘面、6 种寿司。点两个相邻寿司交换,或直接滑动。三个同款连成一线消除;分数到达目标过关;时间条走完结束,每次消除补时间;提示条闲置 8 秒蓄满会自动指路,也可以按"提示"。最高分记在本机。
- **推箱子**:34 关由易到难(第 1 关是照着老手机那关做的十字形)。滑动或按方向键走,方向键按住连续走,中间键撤销(无限次),支持选关,通关和最佳步数自动保存。

## 已知限制

- 记录只存在当前手机的浏览器里(localStorage),换手机、清缓存会丢。
- 不要用微信直接发 `.html` 文件:iOS 的预览不跑脚本,打不开游戏。要发链接。
- 没有音效。

## 开发 / 校验

```
node tools/test-match3.mjs      # 消消乐引擎 + 像素贴图校验(1000 局随机)
node tools/solve.mjs            # 推箱子全关卡求解,任一关无解则报错
node tools/solve.mjs --write    # 按难度重排关卡并写回 index.html(第 1 关固定)
node tools/build-artifact.mjs <输出路径>   # 切出 Artifact 用的页面片段
```

加关卡:在 `index.html` 的 `/*LEVELS-START*/ … /*LEVELS-END*/` 里按 XSB 格式追加(`#` 墙 `.` 目标 `$` 箱 `*` 箱在目标 `@` 人),然后跑 `solve.mjs` 确认可解。
