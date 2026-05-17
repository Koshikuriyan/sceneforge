# SceneForge 🎬
**AI Script → Stock Footage Engine for Faceless YouTube**

---

## Deploy to Vercel in 5 Steps (No coding needed)

### Step 1 — Get your free API keys
- **OpenRouter** (AI): https://openrouter.ai → Sign up → Keys → Create key
  - Free models available (Gemini Flash, Llama 3)
- **Pexels** (footage): https://www.pexels.com/api/ → Free account → Get key
- **Pixabay** (footage): https://pixabay.com/api/docs/ → Register → Copy key

---

### Step 2 — Upload to GitHub
1. Go to https://github.com → Sign up (free)
2. Click **New Repository** → name it `sceneforge` → Create
3. Click **uploading an existing file**
4. Drag the entire contents of this ZIP into the upload area
5. Click **Commit changes**

---

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project**
3. Select your `sceneforge` repo
4. Click **Deploy** (leave all settings default)

---

### Step 4 — Add your OpenRouter API key (IMPORTANT)
1. In Vercel → your project → **Settings** → **Environment Variables**
2. Add:
   - Name: `OPENROUTER_API_KEY`
   - Value: your key from openrouter.ai
3. Click **Save**
4. Go to **Deployments** → click the 3 dots → **Redeploy**

---

### Step 5 — Use it!
- Open your Vercel URL
- Paste your Pexels and Pixabay keys into the app
- Paste your YouTube script
- Hit **ANALYSE SCRIPT & FIND FOOTAGE**
- Click any clip → **Open & Download** → drag into CapCut ✅

---

## How it works
1. Your script is split into sentences
2. AI (via OpenRouter) reads each sentence and extracts a visual search query
3. App searches Pexels + Pixabay for matching videos and photos
4. Results are grouped by scene
5. Click to select, then open to download

## Cost
- Vercel hosting: **FREE**
- Pexels API: **FREE**
- Pixabay API: **FREE**  
- OpenRouter: **FREE** if you use Gemini Flash or Llama 3 (free tier models)
