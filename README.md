# ZaloRemote

**ZaloRemote** là client cho phép điều khiển Zalo từ xa, tích hợp trong ZaloHub hoặc chạy qua trình duyệt.

## Tính năng
- 🌐 Giao diện React + TypeScript hiện đại
- 📱 Remote viewer - xem và điều khiển Zalo từ xa
- 🔐 Đăng nhập bảo mật bằng Google hoặc Access Code
- 👥 Quản lý nhiều phiên kết nối
- 🌍 Đa ngôn ngữ (Việt, Anh, Nhật, Hàn, Trung, Pháp, Tây Ban Nha, Đức, Nga, Thái)
- 🔌 Chrome Extension hỗ trợ

## Cấu trúc
```
ZaloRemote/
├── src/
│   ├── components/       # React components
│   │   ├── LoginPage.tsx
│   │   ├── RemoteViewer.tsx
│   │   ├── ClientPanel.tsx
│   │   ├── ClientsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── SetupPage.tsx
│   │   ├── SidebarNav.tsx
│   │   └── ToastContainer.tsx
│   ├── services/         # Socket.IO client
│   ├── store/            # Zustand state management
│   ├── styles/           # CSS styles
│   ├── App.tsx           # Main app
│   └── i18n.ts           # Internationalization
├── public/               # Static assets
├── chrome-extension/     # Chrome extension
├── index.html            # Entry point
├── vite.config.ts        # Vite config
└── package.json
```

## Phát triển
```bash
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build

# Build Chrome Extension
npm run build:extension
```

## Liên quan
- **[ZaloHub](https://github.com/quangminh1212/ZaloHub)** - Desktop app Windows chạy Zalo server và tạo tunnel để ZaloRemote kết nối tới
