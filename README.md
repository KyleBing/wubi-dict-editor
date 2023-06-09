<img src="https://user-images.githubusercontent.com/12215982/139462759-e6d8ebc6-180d-4d18-8c3c-68234f0ff1c0.png" width="150" />


# 五笔码表助手 for [Rime](https://github.com/rime)
一个管理 Rime 五笔词库的工具 <br/>
该工具主要服务于 [rime-wubi86-jidian](https://github.com/KyleBing/rime-wubi86-jidian) 这个五笔方案

> 可添加、删除、批量导入外部词条、批量生成指定版本的五笔编码。<br/>
> 基于 electron 开发，支持 `macOS` `Windows` `Ubuntu` 多个平台 <br/>
> GitHub: [https://github.com/KyleBing/wubi-dict-editor](https://github.com/KyleBing/wubi-dict-editor) <br/>
> Gitee: [https://gitee.com/KyleBing/wubi-dict-editor](https://gitee.com/KyleBing/wubi-dict-editor)


> 有其它问题，欢迎加群讨论: [878750538](https://jq.qq.com/?_wv=1027&k=st8cY2sI)


## 一、界面截图
主界面

<img width="1362" alt="Screenshot 2022-12-16 at 21 28 54" src="https://user-images.githubusercontent.com/12215982/208109387-5062a921-8eef-4063-9936-42762197d6c8.png">

其它码表工具
<img width="1000" alt="Screen Shot 2021-11-02 at 23 16 34" src="https://user-images.githubusercontent.com/12215982/139876204-aef77bb8-683b-4042-8ec1-f366641eaae5.png">

暗黑模式
<img width="1000" alt="Screen Shot 2021-11-02 at 23 17 27" src="https://user-images.githubusercontent.com/12215982/139876211-00e58bbc-9b49-43f0-83c2-8922109e0660.png">

配置界面
<img width="819" alt="Screen Shot 2021-12-14 at 23 53 11" src="https://user-images.githubusercontent.com/12215982/146032695-35857e96-bbf7-451a-924f-936e802adb86.png">

## 二、处理速度

最多可处理 60万 条数据的码表
<img width="674" alt="Screen Shot 2021-12-03 at 23 27 08" src="https://user-images.githubusercontent.com/12215982/144628323-1fe72bb4-602a-4d50-a904-7df9d7685b16.png">
<img width="1463" alt="Screen Shot 2021-12-03 at 23 26 27" src="https://user-images.githubusercontent.com/12215982/144628297-be39d46f-e802-4204-a389-e3a935f61b81.png">


## 三、支持平台：
Windows, macOS, Ubuntu

## 四、下载

 [> 去往下载页面 <](https://github.com/KyleBing/wubi-dict-editor/releases)

## 五、安装 & 启动

### Windows
直接解压打开 `.exe` 文件即可

### macOS
将 app 移到应用程序 `Applications` 文件夹即可

### Ubuntu
打开下载解压好的 zip 包，指令执行包中的 `五笔码表助手` 程序即可
```bash
./五笔码表助手
```

## 六、关于同步
> 单个词库最大限制在 20000 字

1. 请先前往 [http://kylebing.cn/diary/](http://kylebing.cn/diary/) 注册账号
2. 打开工具 <kbd>配置</kbd> 页面，在最下面<kbd>登录</kbd>即可
3. 同步有三个按钮
   1. <kbd>增量同步</kbd>：合并本地与线上的词库，并将最终的词库上传到线上
   2. <kbd>覆盖本地</kbd>：将舍弃本地词库，用线上的词库覆盖本地词库内容
   3. <kbd>覆盖线上</kbd>：将舍弃上线词库，用本地词库覆盖线上词库内容


## 七、用到的技术
- `nodejs`
- `javascript` `scss` `html`
- `vue 2` [`electron`](https://github.com/electron/electron)

## 八、自己生成对应系统的可执行文件

由于我手头只有两种机器
- `macOS(arm)`
- `Windows`

所以我只能生成这两种平台的可执行文件。像 `Ubuntu` `macOS(Intel)` 就需要自己生成了，生成之后可以将最终的文件分享给我哦。 

接下来说一下生成最终可执行文件的步骤：以 `macOS（Intel）` 系统为例

### 1. 前提：具备外网访问能力
你需要具备一个硬性条件：具有访问外网的能力。
> 原因： 在安装 `electron` 依赖的时候需要用到外网环境，国内网络是无法实现的，会提示网络超时。

### 2. 让 Terminal（终端） 可以访问外网
我们最终需要的是在终端中可以实现访问外网。

如果你是用的 v2rayU，将模式调整到 Global （全局代理） 模式即可，其它软件也是类似的操作，都将它调整至全局模式。但不要忘了当这一切结束之后调回来。

测试你的 terminal 是否可以访问外网，如果没有返回，就是不能访问外网

```bash
curl google.com

# 返回结果
<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
<TITLE>301 Moved</TITLE></HEAD><BODY>
<H1>301 Moved</H1>
The document has moved
<A HREF="http://www.google.com/">here</A>.
</BODY></HTML>
```

### 3. 安装 `nodejs`

`nodejs` 去这个网站下载，找到对应版本下载即可，下载 LTS 的版本即可。
> [https://nodejs.org/en/](https://nodejs.org/en/)

安装完成之后，打开 terminal 输入以下指令测试是否已经安装完成

```bash
node -v

# 安装正常的返回结果，会是一个版本号，像这样：
v16.18.1
```

### 4. 下载该仓库内容

1. 你可以直接从 github 下载打包好的 zip 包解压
    > [https://github.com/KyleBing/wubi-dict-editor/archive/refs/heads/master.zip](https://github.com/KyleBing/wubi-dict-editor/archive/refs/heads/master.zip)
2. 如果你会用 git, 也可以用 git 克隆到本地
    ```bash
    git clone https://github.com/KyleBing/wubi-dict-editor.git
    ```

### 5. 安装依赖
通过 terminal 进入到刚才已经下载或克隆的目录中 `/wubi-dict-editor`

此时你执行 `ls -l` 看到的应该是类似这样的
```bash
Kyle@Kyles-mbp wubi-dict-editor % ls -l
total 1256
-rw-r--r--    1 Kyle  staff    3318 Dec  2 22:06 CHANGELOG.md
-rw-r--r--    1 Kyle  staff   32453 Aug 11  2021 LICENSE
-rw-r--r--    1 Kyle  staff    9908 Dec  7 14:09 README.md
drwxr-xr-x    6 Kyle  staff     192 Nov 28 12:20 assets
drwxr-xr-x    9 Kyle  staff     288 Dec  3 19:11 js
-rw-r--r--    1 Kyle  staff   31138 Dec  3 19:11 main.js
-rw-r--r--    1 Kyle  staff  420973 Dec  2 19:51 package-lock.json
-rw-r--r--    1 Kyle  staff    1957 Dec  2 22:07 package.json
drwxr-xr-x    6 Kyle  staff     192 Nov 28 12:20 view
-rw-r--r--    1 Kyle  staff  131328 Dec  2 21:32 yarn.lock
```

执行以下指令，直到完成
```bash
npm i
```

### 6. 生出可执行文件

```bash
npm run make

# 结果
yarn run v1.22.10
$ electron-forge make
✔ Checking your system
✔ Loading configuration
✔ Resolving make targets
✔ Loading configuration
✔ Resolving make targets
  › Making for the following targets: dmg, zip
✔ Running package command
  ✔ Preparing to package application
  ✔ Running packaging hooks
    ✔ Running generateAssets hook
    ✔ Running prePackage hook
  ✔ Packaging application
    ✔ Packaging for arm64 on darwin [1s]
  ✔ Running postPackage hook
✔ Running preMake hook
✔ Making distributables
  ✔ Making a dmg distributable for darwin/arm64 [11s]
  ✔ Making a zip distributable for darwin/arm64 [6s]
✔ Running postMake hook
  › Artifacts available at: /Users/kyle/github/wubi-dict-editor/out/make
✨  Done in 21.54s.

```


执行完成之后，就会在当前目录中多出一个名为 `/out` 的目录，你生成的最终文件就在 `/out/make` 目录下，名为 `五笔码表助手-1.1.6.dmg` 差不多的名字。

直接打开这个文件就可以安装使用了。






## 开发计划

#### 进程截图记录：
> [https://github.com/KyleBing/wubi-dict-editor/discussions/11](https://github.com/KyleBing/wubi-dict-editor/discussions/11)

#### 纯工具模块
- [x] 工具窗口 `2021-10-18`
  - [x] 设定码表编码词条分隔方式 `\t` `空格` `2021-10-18`
  - [x] 设定码表格式：一码多词、一码一词、一词一码 `2021-10-18`
  - [x] 编辑任意码表文件 `2021-10-18`
  - [x] 批量移动到任意码表文件 `2021-10-22`
- [x] 生成不同版本五笔的编码码表，保存 `2021-10-20`
- [x] 字数筛选 `2021-10-18`
- [x] 查重 `2021-10-20`
- [x] 批量添加词条编码 `2021-10-25`
- [x] 编码查错修正 `2021-12-14`
- [x] 导出选中词条到 plist 文件，用于 macOS 输入法中导入自定义短语 `2022-01-20`

#### 1. 词条
- [x] 展示词库内容 `2021-07-25`
  - [x] 成组显示 组为以 `##` 开头`2021-07-25`
- [x] 搜索词条 `2021-07-26`
  - [x] 基于编码、内容 `2021-07-29`
- [x] 添加自定义短语 `2021-07-26`
  - [x] 自动生成编码 `2021-08-12`
- [x] 删除词条 `2021-07-27`
  - [x] 批量 `2021-07-27`
  - [x] 单个 `2021-08-06`
- [x] 批量删除词条  `2021-07-27`
- [x] 上下移动词条  `2021-07-27`
   - [x] 通过键盘上下移动 `2021-07-27`
   - [x] 非分组状态下的移动 `2021-07-29`
- [x] 展示：分组 | 非分组 码表 `2021-07-28`
- [x] 展示总词数 | 当前词数 | 分组模式 `2021-08-01`
- [x] 按输入码排序 `2021-08-12`
- [x] 任意词条移动到任意码表中
- [x] 右击编辑任意词条内容 `2021-10-23`
- [x] 搜索框添加清空内容的按钮 `2021-10-16`
- [x] shift 批量选词 `2021-10-17`
- [x] 直接在窗口内部切换码表 `2021-11-22`
- [x] 主表查重 `2021-12-13`
- [x] 添加词条备注 `2021-12-13`
- [x] 新增词条时显示已存在的词条 `2023-05-18`

#### 2. 主码表文件
- [x] 词条添加到主码表文件 `2021-08-04`
  - [x] 插入时匹配词条位置 `2021-08-04`
    - [x] 普通词条 -> 主码表 `2021-08-04`
    - [x] 分组词条 -> 主码表 `2021-08-04`
  - [x] 删除已移动的词条 `2021-08-04`
- [x] 主码表展示用时优化 100ms 左右 `2021-08-01`
  - [x] 纯代码处理 8 万多条数据，只用不到 100ms `2021-07-30`
  - [x] 改用 `vue-virtual-scroller` 作为列表载体，加载多少都不会卡 `2021-08-01`

  
#### 3. 分组管理
- [x] 分组类型的码表以 `dict_grouped: true` 开头 `2021-07-29`
- [x] 分组修改组名 `2021-07-27`
- [x] 删除词条后，如果组内词条为空，删除该组 `2021-08-01`
- [x] 分组添加 `2021-08-06`
- [x] 分组删除 `2021-08-06`
- [x] 分组列表，切换展示内容 `2021-08-09`
  - [x] 适配暗黑模式 `2021-08-09`
  - [x] 列表滚动条样式 `2021-08-09`
- [x] 词条在分组之间移动
- [x] 分组上下顺序调整 `2022-12-02`

  
#### 4. 系统相关
- [x] 保存文件后，自动调用 rime 布署方法进行布署
  - [x] macOS `2021-07-28`
  - [x] Windows `2021-07-30`
  - [x] Linux `2021-12-16`

#### 5. 文件操作
- [x] 写入词库内容 `2021-07-26`
  - [x] <kbd>ctrl</kbd> + <kbd>s</kbd> 快捷键保存 `2021-07-27`
  - [x] 非分组时保存到文件 `2021-07-29`
- [x] 默认编辑器打开对应的码表源文本文件 `2021-07-28`


#### 6. 配置页面
- [x] 自定义码表文件对应的名字 `2022-12-02`
- [x] 添加配置页面 `2021-10-14`
- [x] 指定初始载入码表 `2021-10-14`
- [x] 保存后是否立即布署 `2021-10-15`
- [x] 回车键是搜索 | 添加新用户词 `2021-10-15`
  - [x] 搜索时，编码 | 词条 | 同时 | 任一 `2021-10-16`
- [x] 记录最后一次选中的分组 `2021-10-16`
- [x] 暗黑模式切换 `2021-10-16`
- [x] 添加自定义的编码生成用的参考码表 `2021-10-25`
- [x] 手动打开调试窗口


#### 7. 其它
- [x] macOS 暗黑模式适配 `2021-08-08`
- [x] 关于窗口信息 `2021-08-10`
- [ ] 使用帮助页面
- [x] 小狼毫默认使用系统安装的最新版的程序进行部署操作 `2023-06-09`

#### 8. 其它想法
- [x] 全民维护一个增量词库 `2022-12-16`
  - [x] 多用户
  - [x] 能提升词条优先级


## 布署指令

macOS
```bash
"/Library/Input Methods/Squirrel.app/Contents/MacOS/Squirrel" --reload
```

windows
```bash
cd C:\Program Files (x86)\Rime\weasel-0.14.3
WeaselDeployer.exe /deploy
```

## 解决的难题
1. 查重并提取出所有重复的内容
2. 词条根据词条编码判断插入位置
3. 计算 `unicode` 字符串长度 `.length` 的问题



## 支持
感谢 [JetBrains](https://www.jetbrains.com/?from=wubi-dict-editor@KyleBing) 提供的工具支持

![JetBrains](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg?_ga=2.54620846.401568951.1648434626-301403838.1648434626)
