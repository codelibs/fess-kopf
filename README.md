# Fess KOPF

[![Test](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml/badge.svg)](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Fess KOPFは、[Fess](https://fess.codelibs.org/)に統合されたOpenSearch専用のシンプルなWeb管理ツールです。JavaScript + AngularJS + jQuery + Bootstrapで構築されています。

## 概要

このプロジェクトは、[elasticsearch-kopf](https://github.com/lmenezes/elasticsearch-kopf)からフォークされ、OpenSearch 2.x/3.xに対応するようにFess専用にカスタマイズされました。

## サポートバージョン

| OpenSearch | Fess     | 状態       |
|-----------|----------|-----------|
| 2.x       | 15.x     | サポート中  |
| 3.x       | 15.x     | サポート中  |

**注意**: このツールはOpenSearchのみをサポートしており、Elasticsearchには対応していません。

## 主な機能

- **クラスタ概要**: クラスタの状態、ノード、インデックスをリアルタイムで監視
- **インデックス管理**: インデックスの作成、削除、開閉、設定変更
- **エイリアス管理**: インデックスエイリアスの作成と管理
- **スナップショット**: スナップショットの作成、復元、管理
- **インデックステンプレート**: テンプレートの作成と編集
- **アナライザーテスト**: テキスト解析のテストと検証
- **RESTクライアント**: OpenSearch APIへの直接アクセス
- **CAT API**: CAT APIのブラウザベースインターフェース
- **ホットスレッド解析**: ノードのスレッド分析

## 削除された機能

OpenSearch 2.x/3.xでは以下の機能がサポートされていないため削除されました:

- Percolatorクエリ (Elasticsearch 5.xで廃止)
- インデックスWarmer (Elasticsearch 5.xで廃止)
- Benchmark API (Elasticsearch 5.xで削除)

## インストール

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/codelibs/fess-kopf.git
cd fess-kopf

# 依存関係のインストール
npm install

# ビルド
npm run build
```

### 開発サーバーの起動

```bash
npm install
grunt server
```

ブラウザで <http://localhost:9000/_site> にアクセスしてください。

## Fessとの統合

Fess KOPFはFessに直接統合されるように設計されています。ビルドされた`_site/`ディレクトリのファイルは、FessのWebインターフェースを通じて提供されます。

Fessインスタンスを通じて以下のURLでKOPFインターフェースにアクセスできます:

```
http://your-fess-instance/_plugin/kopf/
```

## 設定

`kopf_external_settings.json`ファイルでFess KOPFを設定できます:

```json
{
  "opensearch_root_path": "",
  "with_credentials": false,
  "theme": "fess",
  "refresh_rate": 5000
}
```

### 設定オプション

- **opensearch_root_path**: OpenSearchのルートパス (デフォルト: "")
- **with_credentials**: クロスオリジンリクエストで認証情報を含めるか (デフォルト: false)
- **theme**: UIテーマ (`fess`, `light`, `dark`)
- **refresh_rate**: クラスタ情報の更新間隔（ミリ秒）

### テーマ

- `fess` (デフォルト) - Fess専用テーマ
- `light` - ライトテーマ
- `dark` - ダークテーマ

## 開発

### ビルド

```bash
# 本番用ビルド
npm run build

# 開発サーバー起動（ホットリロード付き）
grunt server
```

### テスト

```bash
# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# コードリント
npm run lint
```

### プロジェクト構造

```
fess-kopf/
├── src/
│   ├── kopf/
│   │   ├── opensearch/      # OpenSearch関連モデル
│   │   ├── controllers/     # AngularJSコントローラー
│   │   ├── services/        # AngularJSサービス
│   │   ├── models/          # データモデル
│   │   ├── filters/         # AngularJSフィルター
│   │   ├── directives/      # AngularJSディレクティブ
│   │   └── css/             # スタイルシート
│   └── lib/                 # サードパーティライブラリ
├── _site/                   # ビルド出力
├── tests/                   # テストファイル
└── Gruntfile.js             # ビルド設定
```

## 使用方法

### クラスタ接続

1. Fess経由でKOPFにアクセス
2. OpenSearchクラスタに自動接続
3. クラスタの状態がダッシュボードに表示されます

### インデックス管理

1. 「cluster」タブでクラスタ概要を表示
2. インデックスをクリックして詳細表示
3. 右クリックメニューから操作を選択:
   - Open/Close
   - Delete
   - Refresh
   - Optimize (Force Merge)
   - Clear Cache

### インデックスの作成

1. 「more」→「create index」を選択
2. インデックス名を入力
3. シャード数、レプリカ数を設定
4. オプションでマッピングと設定を追加
5. 「Create」をクリック

### スナップショットの作成

1. 「more」→「snapshot」を選択
2. リポジトリを作成（初回のみ）
3. 「Create Snapshot」をクリック
4. スナップショット名と対象インデックスを選択
5. 「Create」をクリック

### REST APIの使用

1. 「rest」タブを選択
2. HTTPメソッドを選択（GET, POST, PUT, DELETE）
3. APIパスを入力（例: `_search`, `_cat/indices`）
4. リクエストボディを入力（オプション）
5. 「Send Request」をクリック

## トラブルシューティング

### 接続エラー

OpenSearchに接続できない場合:

1. OpenSearchが起動しているか確認
2. ネットワーク設定を確認
3. CORS設定を確認（OpenSearchの`opensearch.yml`）:
   ```yaml
   http.cors.enabled: true
   http.cors.allow-origin: "*"
   ```

### パフォーマンスの問題

クラスタ情報の読み込みが遅い場合:

1. リフレッシュレートを増やす（設定で`refresh_rate`を調整）
2. 大規模クラスタの場合、ブラウザのメモリを確認

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## クレジット

- オリジナル[elasticsearch-kopf](https://github.com/lmenezes/elasticsearch-kopf) by Leonardo Menezes
- OpenSearch対応とFess統合 by [CodeLibs Project](https://www.codelibs.org/)

## 関連リンク

- [Fess](https://fess.codelibs.org/) - エンタープライズ検索サーバー
- [OpenSearch](https://opensearch.org/) - オープンソース検索エンジン
- [CodeLibs](https://www.codelibs.org/) - Fess開発プロジェクト
