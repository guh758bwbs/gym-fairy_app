# 💪 GYM FAIRY

筋トレの「教えたい」「教えて欲しい」をマッチングするWebアプリです。
種目ごとにスキルを登録し、条件の合う相手を検索してマッチ申請、承認後はリアルタイムチャットでやり取りできます。

🔗 **Demo:** https://guh758bwbs.github.io/gym-fairy_app/

---

## 📸 スクリーンショット

<!-- ここにスクショを貼ってください（例） -->
<!-- ![ログイン画面](./img/screenshot-login.png) -->

---

## ✨ 主な機能

- メール/パスワード認証（Firebase Authentication）
- 種目ごとに「教えたい / 教えて欲しい」を登録・管理
- 条件に合う相手をリアルタイム検索（Firestore collectionGroupクエリ）
- マッチ申請・承認・却下フロー
- 承認後のリアルタイムチャット（Firestore onSnapshot）
- Firestoreセキュリティルールによるアクセス制御

---

## 🔑 デモアカウント

本デモ版は新規登録を停止しています。以下のアカウントでお試しください。

| メールアドレス | パスワード |
|---|---|
| demo1@example.com | demo1234 |
| demo2@example.com | demo1234 |

※ デモ用データのため、予告なくリセットされる場合があります。

---

## 🛠 使用技術

- HTML / CSS / JavaScript（Vanilla JS, ES Modules）
- Firebase Authentication（メール/パスワード認証）
- Cloud Firestore（リアルタイムDB・collectionGroupクエリ）
- Firestore Security Rules（デモアカウント限定のアクセス制御）
- GitHub Pages（デプロイ）

---

## 💡 工夫した点

- `collectionGroup`クエリを使い、全ユーザーの「教えたい」スキルを横断検索できるマッチング機能を実装
- `onSnapshot`によるリアルタイム同期で、スキル一覧・申請状況・チャットを即時反映
- マッチ申請のステータス管理（pending / approved / rejected）をFirestoreルールで厳密に制御
- メールアドレスをマスク表示し、デモ公開時のプライバシーに配慮
- Firestoreセキュリティルールでデモアカウント以外の読み書きを制限

---

## 📁 ディレクトリ構成
