# CrisisConnect 

<div align="center">
  <img src="src/assets/crisisconnect-high-resolution-logo-transparent.png" alt="CrisisConnect Logo" width="200"/>
  
  **AI-Powered Alerts. Real People. Real Safety.**
  
  Stay informed, share updates, and support each other — even when networks go down.
</div>

## 🚨 About CrisisConnect

CrisisConnect is a modern, resilient communication platform designed to keep communities connected during emergencies and crisis situations. Built with React and TypeScript, it provides a robust interface for emergency messaging, alert distribution, and community coordination when traditional communication networks may be compromised.

### Key Features

- **🆘 Emergency Messaging**: Send critical emergency messages with priority routing
- **📡 Offline Mode**: Continue operating even when internet connectivity is limited
- **🗺️ Interactive Map View**: Visualize alerts and incidents geographically
- **📱 Mobile-First Design**: Responsive interface optimized for mobile devices
- **🎨 Modern UI Components**: Built with Radix UI and Tailwind CSS
- **⚡ Real-time Alerts**: Live feed of community alerts and updates
- **💬 Message Management**: Organized messaging system for community coordination

## 🛠️ Technology Stack

### Core Framework
- **React 19.1.1** - Modern React with latest features
- **TypeScript 5.8.3** - Type-safe development
- **Vite 7.1.2** - Fast build tool and dev server

### UI & Styling
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled UI components
- **Lucide React** - Beautiful icon library
- **Class Variance Authority** - Component variant management

### Components Library
- 47+ pre-built UI components including:
  - Form controls (Button, Input, Select, Textarea)
  - Layout components (Card, Sheet, Sidebar, Dialog)
  - Data display (Table, Chart, Badge, Avatar)
  - Navigation (Breadcrumb, Tabs, Pagination)
  - Interactive elements (Tooltip, Popover, Command)

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** 
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/isaac-ron/TSCrisisConnect.git
   cd TSCrisisConnect/crisisconnecttypescript
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google Maps API (Optional)**
   ```bash
   # Create .env file and add your Google Maps API key
   echo "VITE_GOOGLE_MAPS_API_KEY=your_api_key_here" > .env
   ```
   
   To get a Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the **Maps JavaScript API**
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |

## 📱 Application Structure

### Pages
- **HomeScreen**: Main dashboard with emergency actions
- **ComposeMessage**: Emergency message composition interface
- **AlertFeed**: Live feed of community alerts
- **MapView**: Geographic visualization of incidents
- **Messages**: Message management and history
- **BottomNavigation**: Mobile navigation component

### Key Components
```
src/
├── pages/           # Main application pages
├── ui/              # Reusable UI components (47 components)
├── hooks/           # Custom React hooks
├── assets/          # Images, logos, and static assets
└── index.css        # Global styles and Tailwind configuration
```

## 🎨 Design System

### Color Palette
- **Primary**: Deep navy (`hsl(222.2, 84%, 4.9%)`)
- **Emergency**: Bright red (`hsl(0, 100%, 53%)`)
- **Secondary**: Light gray (`hsl(210, 40%, 96%)`)
- **Muted**: Subtle gray (`hsl(215.4, 16.3%, 46.9%)`)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

## 🔧 Development

### Code Quality
- **ESLint** configuration for TypeScript and React
- **Type-safe** development with strict TypeScript settings
- **Component-based** architecture with reusable UI components

### Styling Approach
- **Tailwind CSS** for utility-first styling
- **CSS Custom Properties** for theme variables
- **Component variants** using Class Variance Authority
- **Responsive design** with mobile-first approach

### Build Configuration
- **Vite** for fast development and optimized production builds
- **TypeScript** compilation with strict mode
- **PostCSS** for CSS processing
- **Tree-shaking** for minimal bundle size

## 📦 Dependencies

### Core Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "@radix-ui/react-*": "Latest stable versions",
  "lucide-react": "Latest",
  "tailwindcss": "^3.x",
  "class-variance-authority": "Latest"
}
```

### Development Dependencies
- TypeScript & React type definitions
- ESLint with React and TypeScript plugins
- Vite with React plugin
- PostCSS and Tailwind CSS

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with optimized assets ready for deployment.

### Build Output
- **Minified JavaScript bundles**
- **Optimized CSS**
- **Compressed assets**
- **Source maps** for debugging

## 📈 Performance

- **Bundle Size**: ~334KB (gzipped: ~105KB)
- **CSS Size**: ~0.91KB (gzipped: ~0.49KB)
- **Build Time**: ~14.66s
- **Hot Reload**: < 1s for development changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use existing UI components when possible
- Maintain responsive design principles
- Add proper type definitions
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: Isaac Ron
- **Repository**: [TSCrisisConnect](https://github.com/isaac-ron/TSCrisisConnect)

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

<div align="center">
  <strong>Stay Connected. Stay Safe. Stay Informed.</strong>
</div>
