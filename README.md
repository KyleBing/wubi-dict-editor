# 五笔词库管理工具 for Rime
一个管理 Rime 五笔词库的工具，添加、删除词条


## 支持平台：
Windows, macOS, (Linux 未测试)

## 用到的技术
- nodejs
- electron
- javascript
- scss
- vue 3 
- html

## 开发计划

#### 词条
- [x] 展示词库内容 `2021-07-25`
   - [x] 成组显示 组为以 `##` 开头`2021-07-25`
- [x] 搜索词条 `2021-07-26`
- [x] 写入词库内容 `2021-07-26`
- [x] 添加自定义短语 `2021-07-26`
- [x] 删除词条 `2021-07-27`
- [x] 批量删除词条  `2021-07-27`
- [x] 上下移动词条  `2021-07-27`
   - [x] 通过键盘上下移动 `2021-07-27`
- [x] <kbd>ctrl</kbd> + <kbd>s</kbd> 保存词库到文件 `2021-07-27`

#### 分组管理
- [ ] 分组添加
- [ ] 分组删除
- [x] 分组修改组名 `2021-07-27`
  
#### 系统相关
- [x] 保存文件后，自动调用 rime 布署方法进行布署
  - [x] macOS `2021-07-28`
  - [ ] Windows
  - [ ] Linux
- [x] 默认编辑器打开对应的码表源文本文件 `2021-07-28`
  
#### 主码表文件
- [ ] 选择词条添加到主码表文件
  - [ ] 插入时匹配词条位置
- [ ] 主码表文件载入时间优化，目前很长

#### 其它
- [ ] 关于窗口

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