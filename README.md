# 🎨 Momentum Web Client

> Interface web moderna e minimalista para a plataforma SaaS de produtividade "Momentum" - Zen-Tech Design

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.12-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12.23.24-0055FF?style=flat-square&logo=framer)](https://www.framer.com/motion/)

## 📋 Sobre

O **Momentum Web Client** é uma Single Page Application (SPA) construída com **React** e **TypeScript**, oferecendo uma experiência de usuário imersiva com design **Zen-Tech** (Dark Mode, Glassmorphism, minimalista). A interface apresenta widgets flutuantes e draggáveis para gerenciamento de tarefas, timer Pomodoro, player de música integrado (Spotify/YouTube Music) e relatórios de produtividade.

### Características Principais

- 🎯 **Timer Pomodoro**: Sessões de foco configuráveis com breaks
- ✅ **Gerenciamento de Tarefas**: Sistema completo com tags, prioridades e projetos
- 🎵 **Player de Música**: Integração com Spotify e YouTube Music
- 📊 **Relatórios**: Dashboards de produtividade e métricas
- 🎨 **Design Zen-Tech**: Interface dark mode com glassmorphism
- 🧩 **Widgets Flutuantes**: Componentes draggáveis e personalizáveis
- 🔐 **Autenticação**: Login/Registro com OAuth (Google)
- 💳 **Planos de Assinatura**: Sistema de planos (Vibes, Flow, Epic)

## 🛠️ Tech Stack

### Core

- **[React](https://react.dev/)** `^18.3.1` - Biblioteca UI declarativa
- **[TypeScript](https://www.typescriptlang.org/)** `^5.8.3` - Tipagem estática
- **[Vite](https://vitejs.dev/)** `^7.1.12` - Build tool ultra-rápido
- **[React Router](https://reactrouter.com/)** `^6.30.1` - Roteamento SPA

### Estilização

- **[Tailwind CSS](https://tailwindcss.com/)** `^3.4.17` - Framework CSS utility-first
- **[Framer Motion](https://www.framer.com/motion/)** `^12.23.24` - Biblioteca de animações
- **[Radix UI](https://www.radix-ui.com/)** - Componentes acessíveis headless
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI baseados em Radix
- **[Lucide React](https://lucide.dev/)** `^0.462.0` - Ícones modernos
- **[next-themes](https://github.com/pacocoursey/next-themes)** `^0.3.0` - Gerenciamento de tema

### Estado & Dados

- **[Zustand](https://zustand-demo.pmnd.rs/)** `^5.0.9` - Gerenciamento de estado leve
- **[TanStack Query](https://tanstack.com/query)** `^5.83.0` - Sincronização de dados do servidor
- **[Axios](https://axios-http.com/)** `^1.13.1` - Cliente HTTP

### Formulários & Validação

- **[React Hook Form](https://react-hook-form.com/)** `^7.61.1` - Gerenciamento de formulários
- **[Zod](https://zod.dev/)** `^3.25.76` - Validação de schemas TypeScript
- **[@hookform/resolvers](https://github.com/react-hook-form/resolvers)** `^3.10.0` - Resolvers para validação

### UI Components

- **[Sonner](https://sonner.emilkowal.ski/)** `^1.7.4` - Toast notifications elegantes
- **[Recharts](https://recharts.org/)** `^2.15.4` - Gráficos e visualizações
- **[date-fns](https://date-fns.org/)** `^3.6.0` - Manipulação de datas
- **[cmdk](https://cmdk.paco.me/)** `^1.1.1` - Command menu (⌘K)

### Utilitários

- **[clsx](https://github.com/lukeed/clsx)** `^2.1.1` - Concatenação condicional de classes
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** `^2.6.0` - Merge de classes Tailwind
- **[class-variance-authority](https://cva.style/)** `^0.7.1` - Variantes de componentes

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** `>= 20.x` ([Download](https://nodejs.org/))
- **npm** ou **yarn** (gerenciador de pacotes)
- **Docker** e **Docker Compose** (opcional, para desenvolvimento com containers)
- Backend **Momentum API** rodando (ou URL da API em produção)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd momentum
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# ============================================
# URL da API Backend
# ============================================
VITE_API_URL=http://localhost:3000

# Para produção, use:
# VITE_API_URL=https://sua-api-producao.com
```

> ⚠️ **Importante**: Variáveis de ambiente no Vite devem começar com `VITE_` para serem expostas ao código do cliente.

## 🏃 Rodando a Aplicação

### Modo Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`

O Vite oferece **Hot Module Replacement (HMR)** para atualizações instantâneas durante o desenvolvimento.

### Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

### Preview da Build

```bash
npm run preview
```

Inicia um servidor local para testar a build de produção.

### Usando Docker

#### Desenvolvimento com Docker Compose

```bash
# Build e iniciar container
docker-compose up --build

# Rodar em background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar container
docker-compose down
```

#### Produção com Docker

```bash
# Build da imagem de produção
docker build --target production --build-arg VITE_API_URL=https://sua-api.com -t momentum-web:latest .

# Executar container
docker run -p 80:80 momentum-web:latest
```

## 📁 Estrutura de Pastas

```
momentum/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/              # Componentes UI base (shadcn/ui)
│   │   ├── widgets/         # Widgets flutuantes (Tasks, Pomodoro, Music, etc.)
│   │   ├── AuthWall.tsx     # Proteção de rotas
│   │   ├── BackgroundSelector.tsx
│   │   ├── CommentSection.tsx
│   │   ├── Dock.tsx         # Dock de navegação
│   │   ├── DraggableToolbar.tsx
│   │   ├── FocusApp.tsx     # App principal de foco
│   │   ├── HeadlessMusicPlayer.tsx
│   │   ├── Layout.tsx       # Layout principal
│   │   ├── PomodoroTimer.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── TagManager.tsx
│   │   ├── TaskDetailsModal.tsx
│   │   ├── TasksWidget.tsx
│   │   └── TodoList.tsx
│   ├── pages/               # Páginas/rotas
│   │   ├── Index.tsx        # Página inicial
│   │   ├── Login.tsx
│   │   ├── SignUp.tsx
│   │   ├── AuthCallback.tsx # Callback OAuth
│   │   ├── SpotifyCallback.tsx
│   │   ├── CompleteProfile.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── Plans.tsx        # Página de planos
│   │   └── NotFound.tsx
│   ├── context/             # Context API
│   │   ├── music-player-context.tsx
│   │   ├── subscription-context.tsx
│   │   └── theme-context.tsx
│   ├── hooks/               # Custom Hooks
│   │   ├── use-feature-check.ts
│   │   ├── use-focus-settings.ts
│   │   ├── use-mobile.tsx
│   │   ├── use-profile-check.ts
│   │   ├── use-toast.ts
│   │   ├── useReportsState.ts
│   │   └── useWindowBoundaries.ts
│   ├── lib/                 # Utilitários e helpers
│   │   ├── api.ts           # Cliente Axios configurado
│   │   ├── focus-sound-manager.ts
│   │   └── utils.ts         # Funções utilitárias
│   ├── stores/              # Zustand stores
│   │   └── ui.store.ts      # Estado global da UI
│   ├── config/              # Configurações
│   │   └── focus-sounds.ts  # Configuração de sons de foco
│   ├── styles/              # Estilos globais
│   │   └── animation.css
│   ├── assets/              # Assets estáticos
│   │   ├── momentum-logo.png
│   │   ├── icon-google.png
│   │   ├── icon-spotify.png
│   │   └── icon-music.png
│   ├── App.tsx              # Componente raiz
│   ├── App.css              # Estilos do App
│   ├── main.tsx             # Entry point
│   └── index.css            # Estilos globais
├── public/                  # Arquivos públicos
│   ├── favicon.ico
│   └── robots.txt
├── dist/                    # Build de produção (gerado)
├── vite.config.ts           # Configuração do Vite
├── tailwind.config.ts       # Configuração do Tailwind
├── tsconfig.json            # Configuração TypeScript
└── package.json
```

## 🎨 Design System

### Cores (Zen-Tech Dark)

- **Background**: `#0F1115` (Carvão Profundo)
- **Foreground**: `rgba(255, 255, 255, 0.9)` (Branco Fantasma)
- **Primary**: `#3B82F6` (Electric Blue)
- **Secondary**: `rgba(255, 255, 255, 0.5)` (Cinza Muted)
- **Muted**: `rgba(255, 255, 255, 0.5)`

### Componentes UI

A aplicação utiliza **shadcn/ui**, uma coleção de componentes reutilizáveis construídos com Radix UI e Tailwind CSS. Todos os componentes estão em `src/components/ui/`.

### Glassmorphism

O design implementa efeitos de glassmorphism (vidro fosco) através de:

- Background blur
- Transparência com `backdrop-filter`
- Bordas sutis e sombras suaves

## 🧩 Componentes Principais

### Widgets Flutuantes

- **TasksWidget**: Gerenciamento de tarefas com drag & drop
- **PomodoroWidget**: Timer Pomodoro configurável
- **MusicWidget**: Player de música integrado
- **ProjectsWidget**: Visualização de projetos
- **ReportsWidget**: Relatórios de produtividade
- **BackgroundWidget**: Seletor de backgrounds
- **SupportWidget**: Suporte e feedback

### Componentes de Layout

- **Layout**: Layout principal com sidebar e header
- **Dock**: Dock de navegação inferior
- **DraggableToolbar**: Barra de ferramentas draggável

### Autenticação

- **AuthWall**: Componente de proteção de rotas
- **Login/SignUp**: Formulários de autenticação
- **AuthCallback**: Callback para OAuth

## 🔌 Integração com API

O cliente utiliza **Axios** configurado em `src/lib/api.ts`:

- **Base URL**: Configurada via `VITE_API_URL`
- **Interceptors**: Adiciona token JWT automaticamente
- **Error Handling**: Tratamento de erros 401 (logout automático)

### Exemplo de Uso

```typescript
import { api } from "@/lib/api";

// GET request
const response = await api.get("/tasks");

// POST request
const newTask = await api.post("/tasks", {
  title: "Nova tarefa",
  priority: "HIGH",
});
```

## 📡 Roteamento

A aplicação utiliza **React Router v6** para navegação:

- `/` - Página inicial (Index)
- `/login` - Login
- `/signup` - Registro
- `/auth/callback` - Callback OAuth Google
- `/spotify/callback` - Callback Spotify
- `/complete-profile` - Completar perfil
- `/forgot-password` - Recuperar senha
- `/plans` - Planos de assinatura
- `*` - 404 Not Found

## 🎯 Funcionalidades

### Timer Pomodoro

- Sessões de foco configuráveis (padrão: 25min)
- Breaks curtos (5min) e longos (15min)
- Ciclos configuráveis antes do break longo
- Sons de foco opcionais

### Gerenciamento de Tarefas

- CRUD completo de tarefas
- Sistema de tags e cores
- Prioridades (LOW, MEDIUM, HIGH, URGENT)
- Vinculação a projetos
- Estimativa de duração e sessões

### Player de Música

- Integração Spotify (OAuth)
- Integração YouTube Music (OAuth Google)
- Controles de playback
- Playlists salvas
- Modo foco

### Relatórios

- Dashboards de produtividade
- Gráficos de tempo focado
- Estatísticas de tarefas completadas
- Relatórios semanais/mensais

## 🧪 Testes

```bash
# Executar linter
npm run lint

# Formatar código (se configurado)
npm run format
```

## 📝 Scripts Disponíveis

| Script              | Descrição                                 |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Inicia servidor de desenvolvimento (Vite) |
| `npm run build`     | Build de produção otimizado               |
| `npm run build:dev` | Build em modo desenvolvimento             |
| `npm run preview`   | Preview da build de produção              |
| `npm run lint`      | Executa ESLint                            |

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure a variável de ambiente `VITE_API_URL`
3. Deploy automático a cada push

### Docker

```bash
# Build
docker build --target production --build-arg VITE_API_URL=https://api.exemplo.com -t momentum-web .

# Run
docker run -p 80:80 momentum-web
```

### Nginx (Produção)

A build de produção inclui configuração Nginx otimizada (`nginx.conf`):

- Compressão gzip
- Cache de assets estáticos
- SPA routing (fallback para `index.html`)

## 🔧 Troubleshooting

### Erro: "Cannot find module '@/lib/api'"

Certifique-se de que o alias `@` está configurado no `vite.config.ts` e `tsconfig.json`.

### Erro: "VITE_API_URL is not defined"

Verifique se a variável está no arquivo `.env` e começa com `VITE_`.

### Erro de CORS no navegador

Verifique se o backend está configurado para aceitar requisições do frontend (`FRONTEND_URL`).

### Build falha com erro de memória

Aumente o limite de memória do Node:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

## 🎨 Customização

### Tema

O tema pode ser customizado em `tailwind.config.ts` e `src/index.css`.

### Componentes

Componentes shadcn/ui podem ser adicionados via:

```bash
npx shadcn-ui@latest add [component-name]
```

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Este é um projeto interno. Para contribuições, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para a plataforma Momentum**
