# colossal-bh-AI
bh-AI: Real-Time AI-Enabled Harassment Detection Platform  This repository contains the complete source code for bh-AI, a Next.js and Firebase-powered platform for detecting harassment and abusive behavior in real-time across chat conversations. The app integrates with Google Vertex AI’s Gemini Gemma 3 27B model .
A next-generation web application built with Next.js and Firebase for real-time AI-powered harassment and abusive behavior detection across chat communications.

Table of Contents
Overview

Features

Tech Stack

Getting Started

Folder Structure

Configuration

Usage

Deployment

Contributing

License

Overview
bh-AI is a comprehensive platform designed to foster safer communication in family groups, workplaces, educational institutions, and social communities by detecting harassment and abusive language in real-time. Powered by Google’s Gemini AI and Firebase, bh-AI enables live chat moderation, historical chat analysis, evidence report generation, and insightful user analytics.

Features
Real-Time Toxicity Detection: AI evaluates each message as it’s sent or received, highlighting toxic content instantly.

Context-Aware Moderation: Moderation thresholds customizable per context (Family, Workplace, Educational, Social).

Historical Chat Upload: Analyze exported chats (e.g., WhatsApp .txt files) for retrospective abuse detection.

Evidence Reports: Generate PDF reports for flagged incidents, suitable for legal or administrative use.

User Analytics Dashboard: View personal and contact toxicity trends with detailed charts and risk scores.

Secure Authentication: Firebase Auth provides email/password and Google sign-in with role-based access control.

Push Notifications: Real-time alerts on critical incidents via Firebase Cloud Messaging.

Configurable Settings: Users and admins can set policies, notification preferences, and thresholds.

Speech-to-Text (optional): Transcribe and analyze voice messages for toxicity.

Tech Stack
Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui

Backend & Hosting: Firebase Auth, Firestore, Cloud Functions, Storage

AI & APIs: Google Vertex AI Gemini Gemma 3 27B

Report Generation: Puppeteer for HTML to PDF conversion

Notifications: Firebase Cloud Messaging

Getting Started
Prerequisites
Node.js 18+

Firebase CLI

Google Cloud account with Vertex AI enabled

Installation
bash
git clone https://github.com/yourusername/bh-ai.git
cd bh-ai
npm install
Firebase Setup
Create a Firebase project

Enable Authentication, Firestore, Storage, and Cloud Functions

Place your Firebase config in .env.local

Environment Variables
Configure .env.local with keys such as:

text
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
NEXT_PUBLIC_GEMINI_API_KEY=…
GMAIL_CLIENT_SECRET=…
Folder Structure
text
/app               — Next.js UI components and pages
/lib               — Firebase service, AI integration, types
/components        — Reusable UI components (Chat, Dashboard, Settings)
/functions         — Firebase Cloud Functions for AI calls and report generation
/pages/api         — API routes for uploads and reports
/public            — Static assets like images and icons
Usage
npm run dev to start local dev server

firebase emulators:start to run Firebase locally

Authenticate using email or Google OAuth

Create or join chats, send messages and see live toxicity flags

Upload historical chat files for AI analysis

Access dashboard analytics and generate evidence reports
