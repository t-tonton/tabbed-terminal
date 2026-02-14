あなたは本番品質のデスクトップアプリを構築するシニアエンジニアです。

Tauri v2 + React + TypeScript + Tailwind アプリケーションを構築してください：「タブ付きマルチペイン AI ターミナル IDE」

# 主要目標
ユーザーは複数のプロダクトを並行して開発します。
各プロダクトはタブとして表示されるワークスペースです。
各タブ内で、ユーザーはリサイズ可能なレイアウトで複数の独立した Claude チャットペインを実行できます。
ワークスペースはコンテキストとチャット履歴を分離して保持する必要があります。

# 技術スタック（必須）
- Tauri v2
- React + TypeScript（strict モード）
- Tailwind CSS
- レイアウト: react-resizable-panels
- 状態管理: Zustand
- 永続化: Tauri fs プラグインを使用したローカルファイルシステム JSON
- LLM: Anthropic Claude API（MVP では fetch を使用。キーはローカル保存、ログ出力禁止）

# データモデル
アプリの状態:
- workspaces[]（タブ）
- activeWorkspaceId
- globalSettings（オプション）

Workspace:
- id, name
- projectContext（ワークスペース固有）
- panes[]（各ペインは Claude セッション）
- layout config
- promptPresets[]（name + systemPrompt）で素早くペインを作成
- dirty フラグ（未保存の変更）

Pane:
- id, title
- systemPrompt
- injectContext ブール値
- messages[]（role: user|assistant, content）
- modelConfig（model, temperature, max_tokens）

# ワークスペーステンプレート（必須実装）
新しいタブ作成時に3つのワークスペーステンプレートを提供:
A) New Product: panes = Planner/Coder/Reviewer/PM
B) Maintenance: panes = Triage/Coder/Reviewer/Release
C) Spike: panes = Researcher/Architect/Skeptic/Summarizer
各テンプレートは、それらのロール用の promptPresets（システムプロンプト）もインストールします。

# 動作
- タブ切り替えで現在のワークスペース、そのコンテキスト、ペイン、プリセット、レイアウトが変更されます。
- ペインで送信時にリクエストを構築:
  systemPrompt + (injectContext なら) projectContext + messages + 新しいユーザーメッセージ
- Claude API を呼び出し、アシスタントの返信を追加。
- 失敗時はトランスクリプト内にインラインでエラーメッセージを表示。

# UI 要件
- ダークテーマ、IDE ライクな外観。
- トップツールバー: API ステータス、モデルセレクター、「新規ペイン」、「保存」インジケーター。
- ツールバー下のタブバー:
  - ワークスペース名のタブ
  - + で新規タブ作成（テンプレート選択）
  - x でタブを閉じる（dirty なら確認）
- メインエリア: アクティブなワークスペースのリサイズ可能なペイン。
- 各ペイン:
  - ヘッダー（タイトル）とボタン: システムプロンプト編集、クリア、複製、閉じる
  - トグル: プロジェクトコンテキストを注入
  - 自動スクロール付きチャットトランスクリプト
  - 下部の入力エリア。Cmd/Ctrl+Enter で送信
- サイドドロワー: プロジェクトコンテキストエディター（ワークスペース固有）+ 設定（API キー、デフォルトモデル）。
- ペイン作成:
  - プリセット（ロールテンプレート）またはブランクを選択
  - タイトルとシステムプロンプトを設定

# キーボードショートカット
- Cmd/Ctrl+Enter: フォーカス中のペインで送信
- Cmd/Ctrl+N: 現在のワークスペースに新規ペイン
- Cmd/Ctrl+S: 全ワークスペースを保存
- Cmd/Ctrl+K: 現在のワークスペース内のペイン切り替え
- Cmd/Ctrl+T: 新規タブ（ワークスペース）
- Cmd/Ctrl+W: 現在のタブを閉じる
- Cmd/Ctrl+Shift+]: 次のタブ
- Cmd/Ctrl+Shift+[: 前のタブ

# 永続化
単一の JSON を保存/読み込み:
- version
- activeWorkspaceId
- workspaces（ペイン、プリセット、レイアウト、コンテキスト、設定、dirty 状態を含む（オプション））
起動時: 前回のセッションを自動読み込み。なければ New Product テンプレートでデフォルトワークスペースを作成。

# セキュリティ
- API キーはローカル保存、ログ出力禁止。
- API キーをワークスペース JSON に保存しない。設定に別途保存。
- 「API キーをクリア」ボタンを提供。

# 成果物
1) アーキテクチャとデータフローの説明。
2) コードとフォルダ構造を含む完全に実行可能なプロジェクト。
3) ローカルで実行するための正確なコマンド。
4) ショートカットとテンプレートを記載した README。

# 実装順序
1) 状態モデル + タブ UI + ペインレイアウトのスケルトン（API なし）
2) Claude API 統合 + 設定を追加
3) 永続化を追加
4) UX の仕上げ（dirty インジケーター、確認ダイアログ）
