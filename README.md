# Weather Prediction App

This is a React application built with Vite that predicts minimum temperatures based on the past 14 days of data. It uses a Python backend (served via Vercel Serverless Functions) to run predictions using a `.joblib` model.

## Prerequisites

- Node.js installed
- Python installed (for local backend execution)
- Vercel CLI (optional, but recommended for local dev)

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Local Development**
   To run both the React frontend and the Python backend locally, it is recommended to use the Vercel CLI:

   ```bash
   npm i -g vercel
   vercel dev
   ```

   This will start the development server at `http://localhost:3000`.

   _Note: If you run `npm run dev` directly, the React app will start but the Python API will not be active unless you run it separately._

## Deployment

To deploy to Vercel:

1. Push your code to a Git repository.
2. Import the project into Vercel.
3. Vercel will automatically detect the Vite frontend and the Python API in the `api/` folder.

## Structure

- `src/`: React frontend code.
- `api/`: Python backend code (Serverless Function).
  - `index.py`: The entry point for the prediction API.
  - `linear_regression_model.joblib`: The pre-trained model file.
  - `requirements.txt`: Python dependencies.

## Technologies

- React + TypeScript + Vite
- Vercel Serverless Functions (Python)
- Scikit-learn / Joblib
- Framer Motion (Animations)
- CSS Modules (Styling)
