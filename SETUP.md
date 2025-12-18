# Setup Instructions

## Backend Setup (Laravel)

1. **Navigate to backend directory:**
   ```bash
   cd avatarrbackend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   composer install
   ```

3. **Set up environment file:**
   - Copy `.env.example` to `.env` if it doesn't exist
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

4. **Create storage symlink (IMPORTANT):**
   ```bash
   php artisan storage:link
   ```
   This creates a symbolic link so audio files can be accessed publicly.

5. **Start the Laravel server:**
   ```bash
   php artisan serve
   ```
   The server will run on `http://localhost:8000`

## Frontend Setup (React/Vite)

1. **Navigate to frontend directory:**
   ```bash
   cd vite-project
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Create `.env` file (optional):**
   ```bash
   # Create .env file with your backend URL
   VITE_API_URL=http://localhost:8000
   ```
   Note: If you don't create this file, the frontend will use the Vite proxy (recommended for development).

4. **Start the Vite dev server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Connection Refused Error

If you see `ERR_CONNECTION_REFUSED`:

1. **Check if backend is running:**
   - Open `http://localhost:8000` in your browser
   - You should see the Laravel welcome page

2. **Verify the API endpoint:**
   - Try accessing `http://localhost:8000/api/tts` directly
   - You should get a validation error (which is expected without POST data)

3. **Check ports:**
   - Make sure port 8000 is not being used by another application
   - You can change the Laravel port: `php artisan serve --port=8001`

### CORS Issues

- CORS is already configured in `avatarrbackend/config/cors.php`
- The Vite proxy should handle CORS automatically in development

### Storage Issues

- Make sure you ran `php artisan storage:link`
- Check that `public/storage` exists and is a symlink to `storage/app/public`

### OpenAI API Key

- Make sure `OPENAI_API_KEY` is set in your `.env` file
- The key should start with `sk-`

