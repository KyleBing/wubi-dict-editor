# 五笔词库管理工具 for [Rime](https://github.com/rime)
一个管理 Rime 五笔词库的工具，添加、删除词条


<img width="1512" alt="Screen Shot 2021-07-28 at 22 47 49" src="https://user-images.githubusercontent.com/12215982/127344607-ac651eb6-dcc7-4f39-8ce5-9f30418f7eb7.png">


## 支持平台：
Windows, macOS, (Linux 未测试)


## 用到的技术
- `nodejs`
- `javascript` `scss` `html`
- `vue 3` [`electron`](https://github.com/electron/electron)

## 开发计划

#### 词条
- [x] 展示词库内容 `2021-07-25`
  - [x] 成组显示 组为以 `##` 开头`2021-07-25`
- [x] 搜索词条 `2021-07-26`
  - [x] 基于编码、内容 `2021-07-29`
- [x] 添加自定义短语 `2021-07-26`
- [x] 删除词条 `2021-07-27`
- [x] 批量删除词条  `2021-07-27`
- [x] 上下移动词条  `2021-07-27`
   - [x] 通过键盘上下移动 `2021-07-27`
   - [x] 非分组状态下的移动 `2021-07-29`
- [x] 展示：分组 | 非分组 两种模式的码表 `2021-07-28`

#### 文件操作
- [x] 写入词库内容 `2021-07-26`
  - [x] <kbd>ctrl</kbd> + <kbd>s</kbd> 快捷键保存 `2021-07-27`
  - [x] 非分组时保存到文件 `2021-07-29`
- [x] 默认编辑器打开对应的码表源文本文件 `2021-07-28`


#### 分组管理
- [x] 分组类型的码表以 `dict_grouped: true` 开头 `2021-07-29`
- [x] 分组修改组名 `2021-07-27`
- [ ] 分组添加
- [ ] 分组删除
- [ ] 词条在分组之间移动
  
#### 系统相关
- [x] 保存文件后，自动调用 rime 布署方法进行布署
  - [x] macOS `2021-07-28`
  - [ ] Windows
  - [ ] Linux
  
#### 主码表文件
- [ ] 选择词条添加到主码表文件
  - [ ] 插入时匹配词条位置
- [ ] 主码表文件载入时间优化，目前很长

#### 其它
- [ ] 暗黑模式适配
- [ ] 关于窗口信息

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
