# 小程序管理员后台方案

当前小程序已经预留云端配置读取能力。发布时只需要配置一次云开发环境，后续赛季结束时间、蒲式头像和首页背景图可以在云开发控制台修改，不需要每期重新发布小程序。

官方参考：

- 小程序开发文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 云开发快速开始：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 云数据库：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database.html

## 1. 开通云开发

在微信开发者工具中进入「云开发」，开通一个环境，复制环境 ID。

如果开发者工具顶部提示“测试号不支持上传”，说明当前工程仍然绑定在测试号 AppID 上。需要先在微信公众平台创建或进入正式小程序账号，复制正式 AppID，然后重新导入项目或修改项目配置里的 `appid`。

需要同步确认两点：

- 登录开发者工具的微信号必须是这个正式小程序的管理员或开发者。
- `project.config.json` 里的 `appid` 必须是正式小程序 AppID，不能还是测试号。

## 2. 修改小程序配置

编辑 `apps/miniprogram/pages/index/index.js` 顶部的 `CLOUD_ADMIN_CONFIG`：

```js
const CLOUD_ADMIN_CONFIG = {
  envId: "你的云环境 ID",
  collection: "naruto_pass_config",
  docId: "global"
};
```

这个改动需要发布一次。之后不再需要为了换赛季时间、蒲式头像或背景图而重新发布。

## 3. 创建数据库配置

在云开发数据库中新建集合 `naruto_pass_config`，新增文档 `global`：

```json
{
  "_id": "global",
  "seasonEndDate": "2026-05-31",
  "seasonEndTime": "12:00"
}
```

- `seasonEndDate`：默认赛季结束日期，格式 `YYYY-MM-DD`
- `seasonEndTime`：默认赛季结束时间，格式 `HH:mm`
- `urashikiImage`：蒲式头像，可以是云存储 fileID，也可以是已配置合法域名的 HTTPS 图片地址。没有上传头像前可以先不填这个字段。
- `backgroundImage`：小程序首页和顶部背景图，建议使用云存储 fileID。没有上传背景前可以先不填这个字段。
- `extraNinjas`：追加 S 忍列表。下赛季新增 S 忍时填数组即可，`era` 填 `new` 或 `old`，`image` 可以是云存储 fileID。
- `extraScrolls`：追加秘卷列表。下赛季新增秘卷时填数组即可，`image` 可以是云存储 fileID；不填图片时会显示文字占位。

## 4. 更新下一期

下一期只需要在云开发控制台改这份文档：

```json
{
  "_id": "global",
  "seasonEndDate": "2026-07-31",
  "seasonEndTime": "12:00",
  "urashikiImage": "cloud://你的环境 ID/images/new-pass-s.jpg",
  "backgroundImage": "cloud://你的环境 ID/images/pass-background.jpg",
  "extraNinjas": [
    {
      "id": "new-pass-s-202607",
      "name": "新 S 名称",
      "alias": "短名",
      "era": "new",
      "image": "cloud://你的环境 ID/images/new-pass-s.jpg"
    }
  ],
  "extraScrolls": [
    {
      "id": "new-scroll",
      "name": "新秘卷名称",
      "image": "cloud://你的环境 ID/images/new-scroll.png"
    }
  ]
}
```

小程序启动时会自动读取云端配置，并覆盖本地默认赛季时间、蒲式头像、首页背景图、追加 S 忍和追加秘卷。

## 5. 权限和安全

不要把管理员密码、管理员开关或全局写入逻辑放在小程序前端代码里。小程序代码发布后可以被反编译，客户端里的“密码校验”只能防误触，不能当真正权限。

推荐做法是不买服务器，直接使用微信云开发：

- 你在云开发控制台上传蒲式头像或背景图、修改 `naruto_pass_config/global` 文档。
- 小程序前端只读取这份配置，不开放全局写入入口。
- 只有项目拥有者或被你加入的协作者能进云开发控制台修改。

如果以后想做一个真正的可登录后台页面，也建议用云函数读取当前用户 OpenID，再用白名单判断是否允许写入数据库。

## 6. 本地管理设置

小程序首页右上角有「管理」入口。这个入口现在只在开发版 `develop` 环境显示，适合开发者工具里临时预览；体验版和正式版不会显示。这里可以临时维护赛季时间、蒲式头像、背景图、追加 S 忍和追加秘卷。设置只存在本机缓存里，真正给所有用户同步更新，仍建议使用云开发配置。

## 7. 前台工具箱发布云端

项目已添加云函数 `updateAdminConfig`，开发版管理面板里的「发布到云端」会把当前配置写入 `naruto_pass_config/global`。如果选择了本地图片，发布时会先上传到云存储，再把 `cloud://` fileID 写入数据库。

首次使用：

1. 在微信开发者工具里上传并部署云函数 `updateAdminConfig`。
2. 在开发版管理面板点一次「发布到云端」。
3. 如果提示没有权限，弹窗会显示你的 OpenID。
4. 在云函数 `updateAdminConfig` 的配置里新增环境变量 `ADMIN_OPENIDS`，值填你的 OpenID；多个管理员用英文逗号分隔。
5. 重新部署云函数或更新配置后，再点「发布到云端」。

不要把数据库写权限开放给所有用户。前端按钮只是操作入口，真正权限校验在云函数白名单里。
