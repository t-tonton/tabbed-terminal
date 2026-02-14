# Tabbed Multi-Pane AI Terminal IDE 実装計画

## 概要

Tauri v2 + React + TypeScript + Tailwind CSS で構築する「タブ付きマルチペイン AI ターミナル IDE」の実装計画書。

複数のプロダクトを並行開発するため、ワークスペース（タブ）ごとに独立したコンテキストとチャット履歴を持ち、各ワークスペース内で可変数のClaudeチャットペインをリサイズ可能なレイアウトで配置できる。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Tauri v2 |
| フロントエンド | React + TypeScript (strict) |
| スタイリング | Tailwind CSS |
| レイアウト | react-resizable-panels |
| 状態管理 | Zustand |
| 永続化 | Tauri fs plugin (ローカル JSON) |
| LLM | Anthropic Claude API |

---

## コア設計

### ペイン設計
- **ペイン数は可変**（1つ〜無制限）
- **役割は固定しない**（ユーザーが自由に設定）
- **サイズ調整可能**（ドラッグでリサイズ）
- テンプレートは初期構成の参考例（強制ではない）

### データモデル

```typescript
// アプリ状態
interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  globalSettings: GlobalSettings;
}

// ワークスペース（タブ）
interface Workspace {
  id: string;
  name: string;
  projectContext: string;        // ワークスペース固有のコンテキスト
  panes: Pane[];                 // 可変数のペイン
  layout: LayoutConfig;          // レイアウト設定
  promptPresets: PromptPreset[]; // プリセット集
  dirty: boolean;                // 未保存フラグ
}

// ペイン（Claudeチャットセッション）
interface Pane {
  id: string;
  title: string;
  systemPrompt: string;
  injectContext: boolean;        // プロジェクトコンテキストを注入するか
  messages: Message[];
  modelConfig: ModelConfig;
}

// メッセージ
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  error?: boolean;
}

// モデル設定
interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
}
```

---

## プロジェクト構造

```
agent-tab/
├── src-tauri/                    # Rust バックエンド
│   ├── src/
│   │   ├── main.rs               # Tauri エントリーポイント
│   │   └── lib.rs
│   ├── tauri.conf.json           # Tauri 設定
│   ├── capabilities/
│   │   └── default.json          # パーミッション設定
│   └── Cargo.toml
│
├── src/                          # React フロントエンド
│   ├── main.tsx                  # エントリーポイント
│   ├── App.tsx                   # ルートコンポーネント
│   ├── index.css                 # Tailwind CSS
│   │
│   ├── components/
│   │   ├── ui/                   # 汎用UIパーツ（最小限）
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   └── layout/               # アプリシェル
│   │       ├── AppLayout.tsx     # 全体レイアウト
│   │       ├── Toolbar.tsx       # 上部ツールバー
│   │       ├── TabBar.tsx        # タブバー
│   │       └── SideDrawer.tsx    # サイドドロワー
│   │
│   ├── features/                 # 機能別モジュール
│   │   ├── workspaces/           # ワークスペース + タブ（統合）
│   │   │   ├── components/
│   │   │   │   ├── WorkspaceContainer.tsx
│   │   │   │   ├── PaneLayout.tsx
│   │   │   │   └── TemplateSelector.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── panes/                # チャットペイン
│   │   │   ├── components/
│   │   │   │   ├── Pane.tsx
│   │   │   │   ├── PaneHeader.tsx
│   │   │   │   ├── ChatTranscript.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useChatScroll.ts
│   │   │   └── index.ts
│   │   │
│   │   └── settings/             # 設定
│   │       ├── components/
│   │       │   ├── SettingsPanel.tsx
│   │       │   ├── ProjectContextEditor.tsx
│   │       │   └── ApiKeySettings.tsx
│   │       └── index.ts
│   │
│   ├── services/                 # インフラ層
│   │   ├── llm/                  # LLM 統合
│   │   │   ├── client.ts         # 共通インターフェース
│   │   │   ├── types.ts
│   │   │   └── providers/
│   │   │       └── anthropic.ts  # Claude API
│   │   │
│   │   └── persistence/          # 永続化
│   │       ├── persist.ts        # save/load
│   │       ├── serializer.ts     # JSON schema
│   │       ├── migrate.ts        # versioned migrations
│   │       └── paths.ts          # storage paths
│   │
│   ├── stores/                   # Zustand ストア
│   │   ├── index.ts              # ストアエクスポート
│   │   ├── appStore.ts           # メインストア（スライス統合）
│   │   └── slices/
│   │       ├── workspacesSlice.ts
│   │       ├── panesSlice.ts
│   │       ├── layoutSlice.ts
│   │       └── settingsSlice.ts
│   │
│   ├── hooks/                    # グローバルフック
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── types/                    # 型定義
│   │   ├── index.ts
│   │   ├── workspace.ts
│   │   ├── pane.ts
│   │   └── message.ts
│   │
│   └── utils/                    # ユーティリティ
│       ├── id.ts                 # ID生成
│       ├── templates.ts          # テンプレート定義
│       └── constants.ts
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## コンポーネント階層

```
App
└── AppLayout (components/layout/)
    ├── Toolbar                   # アプリシェル（ビジネスロジックはストアに）
    │   ├── ApiStatus
    │   ├── ModelSelector
    │   ├── NewPaneButton
    │   └── SaveIndicator
    │
    ├── TabBar                    # アプリシェル
    │   ├── Tab[]
    │   └── NewTabButton
    │
    ├── WorkspaceContainer (features/workspaces/)
    │   └── PaneLayout (react-resizable-panels)
    │       └── PanelGroup
    │           ├── Panel
    │           │   └── Pane (features/panes/)
    │           │       ├── PaneHeader
    │           │       ├── ChatTranscript
    │           │       │   └── ChatMessage[]
    │           │       └── ChatInput
    │           └── PanelResizeHandle[]
    │
    └── SideDrawer (components/layout/)
        ├── ProjectContextEditor (features/settings/)
        └── SettingsPanel (features/settings/)
```

---

## Zustand ストア設計

### スライス構成

| スライス | 責務 |
|---------|------|
| `workspacesSlice` | ワークスペース CRUD、アクティブワークスペース管理、タブ操作 |
| `panesSlice` | ペイン CRUD、メッセージ操作、フォーカス管理 |
| `layoutSlice` | ペインサイズ、レイアウト方向、UI状態（モーダル等） |
| `settingsSlice` | API キー状態、デフォルトモデル、グローバル設定 |

### スライス詳細

```typescript
// stores/slices/workspacesSlice.ts
interface WorkspacesSlice {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Actions
  createWorkspace: (template?: WorkspaceTemplate) => string;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  setProjectContext: (workspaceId: string, context: string) => void;
  markDirty: (workspaceId: string) => void;
  markClean: (workspaceId: string) => void;

  // Tab navigation
  nextTab: () => void;
  prevTab: () => void;
}

// stores/slices/panesSlice.ts
interface PanesSlice {
  focusedPaneId: string | null;
  sendingPaneIds: Set<string>;

  // Actions
  createPane: (workspaceId: string, options?: CreatePaneOptions) => string;
  deletePane: (workspaceId: string, paneId: string) => void;
  duplicatePane: (workspaceId: string, paneId: string) => string;
  updatePane: (workspaceId: string, paneId: string, updates: Partial<Pane>) => void;
  clearPane: (workspaceId: string, paneId: string) => void;

  // Messages
  addMessage: (workspaceId: string, paneId: string, message: Message) => void;

  // Focus
  setFocusedPane: (paneId: string | null) => void;
  setSendingPane: (paneId: string, sending: boolean) => void;
}

// stores/slices/layoutSlice.ts
interface LayoutSlice {
  // UI state
  sideDrawerOpen: boolean;
  isNewTabModalOpen: boolean;
  isNewPaneModalOpen: boolean;
  isPaneSwitcherOpen: boolean;
  editingPaneId: string | null;

  // Actions
  toggleSideDrawer: () => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  openNewPaneModal: () => void;
  closeNewPaneModal: () => void;
  openPaneSwitcher: () => void;
  closePaneSwitcher: () => void;
  openPaneEditor: (paneId: string) => void;
  closePaneEditor: () => void;
}

// stores/slices/settingsSlice.ts
interface SettingsSlice {
  apiKeyConfigured: boolean;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  isSaving: boolean;

  // Actions
  setApiKeyConfigured: (configured: boolean) => void;
  setDefaultModel: (model: string) => void;
  setDefaultTemperature: (temp: number) => void;
  setDefaultMaxTokens: (tokens: number) => void;
  setIsSaving: (saving: boolean) => void;
}
```

---

## 実装フェーズ

### フェーズ 1: プロジェクトセットアップ + UI スケルトン

**目標**: 基本的なプロジェクト構造とUI骨格の構築

- [ ] Tauri v2 + React + TypeScript プロジェクト作成
- [ ] Tailwind CSS 設定（ダークテーマ）
- [ ] 基本型定義ファイル作成
- [ ] AppLayout コンポーネント作成
- [ ] Toolbar スケルトン作成
- [ ] TabBar スケルトン作成
- [ ] Zustand ストア基本構造作成
- [ ] react-resizable-panels でペインレイアウト構築

### フェーズ 2: ワークスペース + ペイン機能

**目標**: ワークスペースとペインの完全な CRUD 機能

- [ ] ワークスペーステンプレート定義（参考例として）
  - New Product / Maintenance / Spike
  - Blank（空のワークスペース）
- [ ] 新規タブ作成モーダル
- [ ] タブ閉じる機能（dirty 確認付き）
- [ ] ペイン追加/削除（数の制限なし）
- [ ] ペインのドラッグリサイズ
- [ ] ペインヘッダー機能
  - タイトル表示/編集
  - コンテキスト注入トグル
  - クリア/複製/閉じるボタン
- [ ] システムプロンプト編集モーダル
- [ ] チャットトランスクリプト表示
- [ ] チャット入力エリア

### フェーズ 3: Claude API 統合

**目標**: Claude API との通信とチャット機能の完成

- [ ] API キー設定 UI（サイドドロワー内）
- [ ] API キーのセキュア保存（ワークスペースJSONとは別）
- [ ] Claude API クライアント実装
- [ ] メッセージ送信機能
  - systemPrompt + projectContext（オプション）+ messages 構築
  - API 呼び出し
  - レスポンス追加
  - エラーハンドリング（インライン表示）
- [ ] ローディング状態表示
- [ ] API ステータスインジケーター
- [ ] モデルセレクター

### フェーズ 4: 永続化

**目標**: アプリ状態の保存と復元

- [ ] Tauri fs plugin 設定
- [ ] `services/persistence/` 実装
- [ ] 起動時の自動読み込み
- [ ] Cmd/Ctrl+S で保存
- [ ] 初回起動時のデフォルトワークスペース作成

**ファイル分割:**

| ファイル | 内容 | 機密性 |
|---------|------|--------|
| `workspace.json` | ワークスペース、ペイン、メッセージ、レイアウト | 非機密 |
| `settings.json` | API キー、グローバル設定 | **機密** |

**重要**: API キーは絶対に `workspace.json` に保存しない

### フェーズ 5: キーボードショートカット

**目標**: 全キーボードショートカットの実装

| ショートカット | 機能 |
|---------------|------|
| Cmd/Ctrl+Enter | フォーカス中のペインで送信 |
| Cmd/Ctrl+N | 新規ペイン |
| Cmd/Ctrl+S | 保存 |
| Cmd/Ctrl+K | ペインスイッチャー |
| Cmd/Ctrl+T | 新規タブ |
| Cmd/Ctrl+W | タブを閉じる |
| Cmd/Ctrl+Shift+] | 次のタブ |
| Cmd/Ctrl+Shift+[ | 前のタブ |

### フェーズ 6: UX 仕上げ

**目標**: ユーザー体験の向上と細部の調整

- [ ] Dirty インジケーター（タブに * 表示）
- [ ] 未保存タブ閉じる時の確認ダイアログ
- [ ] チャットトランスクリプト自動スクロール
- [ ] ローディングスピナー
- [ ] ツールチップ
- [ ] ステータスバー（Active, Sync状態, 時刻）
- [ ] 空状態の表示

---

## 永続化設計

### ファイル構成

```
~/.config/agent-tab/           # macOS/Linux
%APPDATA%/agent-tab/           # Windows
├── workspace.json             # 非機密データ
└── settings.json              # 機密データ（API キー）
```

### workspace.json（非機密）

```typescript
interface WorkspaceData {
  version: number;
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
}
```

### settings.json（機密）

```typescript
interface SettingsData {
  apiKey: string;              // 暗号化推奨（将来）
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}
```

### マイグレーション

`services/persistence/migrate.ts` でバージョン管理:
- version 1 → 2: スキーマ変更時に自動変換
- 既存データを壊さない

---

## セキュリティ

- API キーは `settings.json` に保存（`workspace.json` には**絶対に保存しない**）
- API キーはログ出力禁止
- 「API キーをクリア」ボタンを提供
- 将来: API キーの暗号化保存を検討

---

## 実行コマンド

```bash
# プロジェクト作成
npm create tauri-app@latest agent-tab -- --template react-ts
cd agent-tab

# 依存関係インストール
npm install zustand react-resizable-panels
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 開発サーバー起動
npm run tauri dev

# プロダクションビルド
npm run tauri build
```

---

## 検証方法

1. `npm run tauri dev` でアプリ起動
2. 新規タブ作成 → テンプレートまたはBlank選択
3. ペイン追加/削除 → 自由に数を変更できることを確認
4. ペイン境界をドラッグ → サイズ調整できることを確認
5. 各ペインでメッセージ送信 → Claude応答確認
6. タブ切り替え → コンテキスト分離確認
7. Cmd+S → 保存 → アプリ再起動 → 復元確認
8. 全キーボードショートカット動作確認
