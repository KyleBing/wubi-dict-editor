> ## 开发进行中 ... 

# 五笔词库管理工具 for [Rime](https://github.com/rime)
一个管理 Rime 五笔词库的工具，添加、删除词条

<img width="812" alt="Screen Shot 2021-08-09 at 21 35 45" src="https://user-images.githubusercontent.com/12215982/128715098-8dc4c6d6-76f8-4428-9434-e3ac86ab2072.png">
<img width="812" alt="Screen Shot 2021-08-09 at 21 35 34" src="https://user-images.githubusercontent.com/12215982/128715114-8e9f82ff-2bdb-4837-87ed-ecbf0ea7ee28.png">
## 支持平台：
Windows, macOS, (Linux 未测试)

## 下载

去往下载页面 [https://github.com/KyleBing/wubi-dict-editor/releases](https://github.com/KyleBing/wubi-dict-editor/releases)

## 安装

__windows__ 直接解压打开 `.exe` 文件即可

__macOS__ 如果提示无法打开，文件损坏什么的，将 app 移到应用程序 `Applications` 文件夹后，打开终端 `Terminal`，这样操作：

```bash
sudo xattr -rd com.apple.quarantine /Applications/wubi-dict-editor.app/
```

这样应该就能打开了。


## 用到的技术
- `nodejs`
- `javascript` `scss` `html`
- `vue 2` [`electron`](https://github.com/electron/electron)

## 开发计划

#### 进程截图记录：
> [https://github.com/KyleBing/wubi-words-editor/discussions/2](https://github.com/KyleBing/wubi-dict-editor/discussions/2)

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
- [ ] 右击编辑任意词条内容
- [ ] 提醒
  - [ ] 未保存时
  - [ ] 删除词组时
- [ ] ？词条优先级，加权重
- [ ] 查重，并选中

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
- [ ] 指定初始载入码表
- [ ] 保存后是否立即布署
- [ ] 删除元素时，如果组内词条为空，是否删除该组


#### 7. 其它
- [x] macOS 暗黑模式适配 `2021-08-08`
- [ ] 使用帮助页面
- [x] 关于窗口信息 `2021-08-10`

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
