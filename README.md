# colossal-bh-AI
bh-AI: Real-Time AI-Enabled Harassment Detection Platform  This repository contains the complete source code for bh-AI, a Next.js and Firebase-powered platform for detecting harassment and abusive behavior in real-time across chat conversations. The app integrates with Google Vertex AI’s Gemini Gemma 3 27B model .
A next-generation web application built with Next.js and Firebase for real-time AI-powered harassment and abusive behavior detection across chat communications.


Project Overview
bh-AI aims to create safer digital communication in family groups, workplaces, educational circles, and social communities by providing:

Real-time toxicity detection with AI-assisted flagging

Context-aware thresholds tuned per environment

Historical chat upload and retrospective analysis

Automated, shareable PDF evidence reports

Personalized analytics dashboard with detailed trends

User authentication and access control

Push notifications on critical incidents

Speech-to-text support for voice interactions

By tightly integrating Firebase’s real-time database & serverless cloud functions with advanced AI models, bh-AI stands as a powerful tool for moderation and digital well-being.

Features
Authentication
Secure email/password and Google sign-in via Firebase Authentication

Role-based user access (user and admin)

Profile customization, including chat context preferences

Real-Time Chat
Persistent bi-directional chat with live toxicity scoring

Context-sensitive flagging and warning popups for high toxicity

Participant search and direct chat creation

Historical Upload
Parse and analyze exported WhatsApp chat logs (.txt)

Batch message toxicity score processing

Generate downloadable evidence reports

Analytics Dashboard
Summary of total & flagged messages

Per-context toxicity trends via charts

Top offender identification with detailed records

Reports Center
Manage generated PDF reports

Scheduled automatic report generation

Download and share reports securely

Settings
Modify context-specific toxicity thresholds

Toggle notifications and alerts

Notifications
Firebase Cloud Messaging for real-time push alerts

Tech Stack
Frontend: Next.js 14 | React 18 | TypeScript | Tailwind CSS | shadcn/ui

Backend: Firebase Firestore | Authentication | Cloud Functions | Storage

AI Model: Google Vertex AI Gemini Gemma 3 27B (toxicity scoring & suggestions)

PDF Generation: Puppeteer in Cloud Functions

Notifications: Firebase Cloud Messaging (FCM)

Speech-to-Text: Google Cloud Speech API (optional)

Installation
Prerequisites
Node.js v18+

Firebase CLI (installed globally)

Firebase project with enabled Auth, Firestore, Storage, Functions, and FCM

Google Cloud account with Vertex AI enabled

Steps
Clone the repository

bash
git clone https://github.com/yourusername/bh-ai.git
cd bh-ai
Install dependencies

bash
npm install
cd functions
npm install
cd ..
Firebase Setup

Create Firebase project, enable necessary APIs.

Setup OAuth Client IDs on Google Cloud Console (for Gmail integration).

Set environment variables in .env.local and Firebase Functions config.

Set environment variables:

bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

GMAIL_CLIENT_SECRET=your_gmail_client_secret  # server-side only
NEXT_PUBLIC_APP_URL=https://yourdomain.com
Run app locally

bash
npm run dev
firebase emulators:start
Folder Structure
text
/app                  # Next.js pages and layouts
/lib                  # Firebase initialization, service wrappers, AI integration, types
/components           # Reusable UI components (Chat, Dashboard, Settings...)
/functions            # Firebase Cloud Functions (AI calls, reports, chat moderation)
/pages/api            # Next.js API routes (OAuth, uploads, reports)
/public               # Static assets like icons and images
Usage Guide
Securely sign in and customize context-based tolerance settings

Create or join chats, send messages, see immediate toxicity analysis & feedback

Upload WhatsApp .txt chat exports to analyze past conversations

Access analytics dashboard for detailed insights and flagged message trends

Generate or schedule PDF evidence reports for accountability and review

Adjust personal or admin policy settings on moderation sensitivity and notifications

Optionally enable speech-to-text transcription for audio moderation

Architecture Overview
Frontend requests and subscribes to Firestore collections in real-time.

Firestore stores users, chats, messages, and generated reports securely with strict rules.

Cloud Functions process new messages, call Gemini AI to score toxicity, update DB flags, and notify users/admins.

AI Service calls Google Vertex AI Gemini API for toxicity analysis and suggestions.

PDF Reports rendered via Puppeteer and stored securely in Firebase Storage.

Optional speech data processed using Google Cloud Speech API and added to chat as text messages.

Push Notifications sent through Firebase Cloud Messaging on important flagged events.

Security
Firestore Security Rules enforce strict document access by user roles and ownership.

HTTPS and OAuth secure all API and authentication flows.

Sensitive keys stored securely in environment and Cloud Function config.

GDPR-compliant user data deletion endpoints included.

Contributing
Fork this repo and create feature branches.

Run all tests and linters before PR.

Maintain code style with Prettier and ESLint.

Open issues and PRs for bugs, features, or improvements.

License
MIT License © 2025 bh-AI team
