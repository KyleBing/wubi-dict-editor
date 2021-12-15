<img src="https://user-images.githubusercontent.com/12215982/139462759-e6d8ebc6-180d-4d18-8c3c-68234f0ff1c0.png" width="150" />


# 五笔助手 for [Rime](https://github.com/rime)
一个管理 Rime 五笔词库的工具，添加、删除词条，可批量导入外部词库
该工具主要服务于 [rime-wubi86-jidian](https://github.com/KyleBing/rime-wubi86-jidian) 这个五笔方案

> 有其它问题，欢迎加群讨论: [878750538](https://jq.qq.com/?_wv=1027&k=st8cY2sI)

> GitHub: [https://github.com/KyleBing/wubi-dict-editor](https://github.com/KyleBing/wubi-dict-editor) <br/>
> Gitee: [https://gitee.com/KyleBing/wubi-dict-editor](https://gitee.com/KyleBing/wubi-dict-editor)

主界面
<img width="1000" alt="Screen Shot 2021-12-14 at 23 37 53" src="https://user-images.githubusercontent.com/12215982/146030612-43a0af6a-f893-4c6c-8b25-2de4ef29eefc.png">

其它码表工具
<img width="1000" alt="Screen Shot 2021-11-02 at 23 16 34" src="https://user-images.githubusercontent.com/12215982/139876204-aef77bb8-683b-4042-8ec1-f366641eaae5.png">

暗黑模式
<img width="1000" alt="Screen Shot 2021-11-02 at 23 17 27" src="https://user-images.githubusercontent.com/12215982/139876211-00e58bbc-9b49-43f0-83c2-8922109e0660.png">

配置界面
<img width="819" alt="Screen Shot 2021-12-14 at 23 53 11" src="https://user-images.githubusercontent.com/12215982/146032695-35857e96-bbf7-451a-924f-936e802adb86.png">

## 加载速度

最多可处理 60万 条数据的码表
<img width="674" alt="Screen Shot 2021-12-03 at 23 27 08" src="https://user-images.githubusercontent.com/12215982/144628323-1fe72bb4-602a-4d50-a904-7df9d7685b16.png">
<img width="1463" alt="Screen Shot 2021-12-03 at 23 26 27" src="https://user-images.githubusercontent.com/12215982/144628297-be39d46f-e802-4204-a389-e3a935f61b81.png">


## 支持平台：
Windows, macOS, (Linux 未测试)

## 下载

 [> 去往下载页面 <](https://github.com/KyleBing/wubi-dict-editor/releases)

## 安装

__windows__ 直接解压打开 `.exe` 文件即可

__macOS__ 如果提示无法打开，文件损坏什么的，将 app 移到应用程序 `Applications` 文件夹后，打开终端 `Terminal`，这样操作：

```bash
sudo xattr -rd com.apple.quarantine /Applications/五笔助手.app/
```

这样应该就能打开了。


## 用到的技术
- `nodejs`
- `javascript` `scss` `html`
- `vue 2` [`electron`](https://github.com/electron/electron)

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
  
#### 4. 系统相关
- [x] 保存文件后，自动调用 rime 布署方法进行布署
  - [x] macOS `2021-07-28`
  - [x] Windows `2021-07-30`
  - [ ] Linux

#### 5. 文件操作
- [x] 写入词库内容 `2021-07-26`
  - [x] <kbd>ctrl</kbd> + <kbd>s</kbd> 快捷键保存 `2021-07-27`
  - [x] 非分组时保存到文件 `2021-07-29`
- [x] 默认编辑器打开对应的码表源文本文件 `2021-07-28`


#### 6. 配置页面
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

#### 8. 其它想法
- [ ] 全民维护一个增量词库
  - [ ] 多用户
  - [ ] 能提升词条优先级


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
3. 计算 unicode 字符串长度 .length 的问题
