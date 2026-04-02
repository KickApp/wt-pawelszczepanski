import fs from 'fs';
import path from 'path';
import express from 'express';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { logger } from './logger';
import { errorHandler } from './middleware/error-handler';
import accountsRoutes from './routes/accounts.routes';
import journalEntriesRoutes from './routes/journal-entries.routes';
import reportsRoutes from './routes/reports.routes';
import exportRoutes from './routes/export.routes';
import * as ingestController from './controllers/ingest.controller';

const specPath = path.join(__dirname, '..', 'openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

// OpenAPI docs — served from static openapi.yaml (source of truth)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
app.get('/openapi.json', (_req, res) => res.json(spec));

// Home page — retro under construction
app.get('/', (_req, res) => {
  res.type('text/html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>~*~ wElCoMe To MoDeRn AcCoUnTiNg ~*~</title>
  <style>
    body {
      background-color: #000080;
      color: #00FF00;
      font-family: 'Comic Sans MS', 'Papyrus', cursive;
      text-align: center;
      margin: 0;
      padding: 20px;
    }
    h1 {
      color: #FF00FF;
      font-size: 36px;
      text-shadow: 2px 2px #FF0000;
    }
    .blink {
      animation: blinker 0.8s step-start infinite;
      color: #FFFF00;
      font-size: 28px;
      font-weight: bold;
    }
    @keyframes blinker {
      50% { opacity: 0; }
    }
    .construction-gif {
      margin: 10px;
    }
    hr {
      border: none;
      height: 3px;
      background: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red);
    }
    .visitor-counter {
      background: #000;
      color: #0f0;
      font-family: 'Courier New', monospace;
      padding: 5px 15px;
      border: 2px inset #808080;
      display: inline-block;
      font-size: 18px;
    }
    a { color: #00FFFF; }
    a:visited { color: #FF69B4; }
    .guestbook {
      border: 3px outset #C0C0C0;
      background: #C0C0C0;
      color: #000;
      padding: 10px 20px;
      font-size: 16px;
      font-family: 'Times New Roman', serif;
      cursor: pointer;
      display: inline-block;
      margin: 10px;
    }
    table.main {
      margin: 0 auto;
      border: 3px ridge #C0C0C0;
      background: #000033;
      padding: 20px;
      max-width: 800px;
    }
    .sparkle {
      font-size: 10px;
      color: #FFD700;
    }
    .midi-notice {
      font-size: 11px;
      color: #999;
      font-family: 'Courier New', monospace;
    }
    .netscape-badge {
      border: 2px outset #C0C0C0;
      background: #C0C0C0;
      color: #000;
      padding: 5px 10px;
      font-size: 12px;
      font-family: 'Times New Roman', serif;
      display: inline-block;
      margin: 5px;
    }
  </style>
</head>
<body>
  <table class="main"><tr><td>

    <img src="https://blog.archive.org/wp-content/uploads/2016/10/underconstruction.gif" alt="Under Construction" class="construction-gif" width="200">

    <h1>~*~ WeLcOmE tO My HoMePaGe ~*~</h1>

    <marquee behavior="scroll" direction="left" scrollamount="5">
      <span class="blink">*** THIS PAGE IS UNDER CONSTRUCTION !!! ***</span>
    </marquee>

    <hr>

    <p class="blink" style="color: #FF0000; font-size: 22px;">
      ! ! ! PARDON OUR DUST ! ! !
    </p>

    <p style="color: #FFFFFF; font-size: 16px; font-family: 'Times New Roman', serif;">
      This is an example ephemeral deployment with this simple homepage.<br>
      Please come back soon to see the finished site!!!
    </p>

    <hr>

    <img src="https://blog.archive.org/wp-content/uploads/2016/10/internet1.gif" alt="Internet" class="construction-gif">
    <img src="https://blog.archive.org/wp-content/uploads/2016/11/surfcpu.gif" alt="Surfing the Web" class="construction-gif">
    <img src="https://blog.archive.org/wp-content/uploads/2016/11/webfun.gif" alt="Web Fun" class="construction-gif">

    <hr>

    <p>
      <span class="sparkle">*.~</span>
      <img src="https://blog.archive.org/wp-content/uploads/2016/11/skullmail.gif" alt="Email Me" class="construction-gif" width="40">
      <a href="mailto:webmaster@example.com">EMAIL THE WEBMASTER</a>
      <img src="https://blog.archive.org/wp-content/uploads/2016/11/skullmail.gif" alt="Email Me" class="construction-gif" width="40">
      <span class="sparkle">~.*</span>
    </p>

    <marquee behavior="alternate" scrollamount="3">
      <img src="https://blog.archive.org/wp-content/uploads/2016/10/dinosaur.gif" alt="Dinosaur" width="80">
    </marquee>

    <hr>

    <img src="https://blog.archive.org/wp-content/uploads/2016/11/gif_guitarman.gif" alt="Guitar Man" class="construction-gif" width="60">
    <img src="https://blog.archive.org/wp-content/uploads/2016/10/dancing_baby.gif" alt="Dancing Baby" class="construction-gif" width="80">
    <img src="https://blog.archive.org/wp-content/uploads/2016/11/skeletonworm.gif" alt="Skeleton" class="construction-gif" width="60">

    <br><br>

    <div class="guestbook">&#128221; SIGN MY GUESTBOOK &#128221;</div>

    <br><br>

    <marquee behavior="scroll" direction="right" scrollamount="2" style="color: #FFD700; font-size: 14px;">
      <span class="sparkle">*~*~*~*~*</span> You are visitor number: <span class="visitor-counter">000,001,337</span> <span class="sparkle">*~*~*~*~*</span>
    </marquee>

    <hr>

    <p class="midi-notice">
      &#127925; MIDI auto-play: canyon.mid (turn up your speakers!) &#127925;
    </p>

    <br>

    <img src="https://blog.archive.org/wp-content/uploads/2016/11/doorsmor.gif" alt="Enter" class="construction-gif" width="100">

    <br><br>

    <div class="netscape-badge">&#127760; Best viewed in Netscape Navigator 4.0 at 800x600</div>
    <br>
    <div class="netscape-badge">&#128187; Made on a Pentium II MMX</div>

    <br><br>

    <img src="https://blog.archive.org/wp-content/uploads/2016/11/line.gif" alt="divider" width="400">

    <p style="font-size: 11px; color: #808080; font-family: 'Times New Roman', serif;">
      &copy; 1999 All Rights Reserved | Last updated: January 1st, 2000<br>
      This site is Y2K compliant!!!
    </p>

  </td></tr></table>
</body>
</html>`);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/journal-entries', journalEntriesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/export', exportRoutes);
app.post('/api/ingest', ingestController.ingest);

// Error handler
app.use(errorHandler);

export default app;
