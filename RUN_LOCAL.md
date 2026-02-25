# Running Clipboard Locally

Follow these steps to initialize the JB³Ai Clipboard prototype in your local environment.

### 1. Prerequisites
- **Node.js:** Ensure Version 18 or higher is installed.
- **Package Manager:** NPM or Yarn.

### 2. Setup
Clone or download the project files into a directory.

```bash
# Install core dependencies
npm install lucide-react framer-motion clsx tailwind-merge
```

### 3. Execution
Launch the development server.

```bash
npm run dev
```

### 4. Authentication (Mock)
To access the app; use one of the allowlisted emails:
- `jono@jonoblackburn.com`
- `gsourlis@yahoo.com`

On your first login; setting any 4-digit PIN will associate it with your email in `localStorage`.

### 5. Deployment Note
For production deployment to jb3ai.com/clipboard:
- Update `services/db.ts` to connect to your Supabase instance.
- Execute the provided `SQL.sql` in the Supabase SQL editor.
- Configure Supabase Auth to only allow the specific stakeholder emails.
