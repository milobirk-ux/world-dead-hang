/**
 * WDHC Social Proof System - Configuration Template
 * 
 * Copy this file to config.js and fill in your actual values
 * NEVER commit actual API keys to version control
 * 
 * @author Otis (Night Shift Autopilot)
 * @version 1.0
 * @date 2026-03-26
 */

const CONFIG = {
  // ====================
  // GOOGLE SHEETS CONFIG
  // ====================
  GOOGLE_SHEETS: {
    // Your WDHC database spreadsheet ID
    // Found in URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
    
    // Sheet name containing submissions
    SHEET_NAME: 'custom form submissions',
    
    // Log sheet for tracking
    LOG_SHEET_NAME: 'Social Proof Log',
    
    // Service account credentials (for automated access)
    // Create service account: https://console.cloud.google.com/iam-admin/serviceaccounts
    SERVICE_ACCOUNT: {
      client_email: 'your-service-account@your-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n',
      project_id: 'your-project-id'
    }
  },
  
  // ====================
  // TWITTER/X API CONFIG
  // ====================
  TWITTER: {
    // Get these from Twitter Developer Portal: https://developer.twitter.com/
    API_KEY: 'YOUR_API_KEY_HERE',
    API_SECRET: 'YOUR_API_SECRET_HERE',
    ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN_HERE',
    ACCESS_SECRET: 'YOUR_ACCESS_SECRET_HERE',
    BEARER_TOKEN: 'YOUR_BEARER_TOKEN_HERE',
    
    // Twitter account to post from
    USERNAME: '@WorldDeadHang',
    
    // Post settings
    POST_SETTINGS: {
      include_media: true, // Attach generated graphic
      reply_settings: 'everyone', // who can reply
      possibly_sensitive: false
    }
  },
  
  // ====================
  // GRAPHIC GENERATION
  // ====================
  GRAPHICS: {
    // Canva API (recommended for professional graphics)
    // Sign up: https://www.canva.com/developers/
    CANVA: {
      api_key: 'YOUR_CANVA_API_KEY_HERE',
      template_id: 'YOUR_CANVA_TEMPLATE_ID_HERE',
      brand_id: 'YOUR_CANVA_BRAND_ID_HERE'
    },
    
    // Alternative: HTML2Canvas (local generation)
    // No API key needed, runs locally
    HTML2CANVAS: {
      enabled: true,
      quality: 0.95, // Image quality (0-1)
      scale: 2, // Resolution multiplier
      backgroundColor: '#050505'
    },
    
    // Cloud storage for generated graphics
    STORAGE: {
      provider: 'google_cloud', // or 'aws_s3', 'cloudinary'
      bucket_name: 'wdhc-social-graphics',
      public_url_base: 'https://storage.googleapis.com/wdhc-social-graphics/'
    }
  },
  
  // ====================
  // SCHEDULING & LIMITS
  // ====================
  SCHEDULING: {
    // How often to check for new submissions (in minutes)
    CHECK_INTERVAL: 120, // 2 hours
    
    // Maximum posts per run (avoid rate limits)
    MAX_POSTS_PER_RUN: 5,
    
    // Time windows for posting (24-hour format)
    POSTING_HOURS: {
      start: 8,  // 8:00 AM
      end: 22    // 10:00 PM
    },
    
    // Days of week to post (0=Sunday, 1=Monday, etc.)
    POSTING_DAYS: [1, 2, 3, 4, 5, 6], // Monday through Saturday
  },
  
  // ====================
  // CONTENT SETTINGS
  // ====================
  CONTENT: {
    // Post templates (use {variables})
    POST_TEMPLATES: {
      NEW_SUBMISSION: `🎉 NEW WDHC SUBMISSION!\n\n{name} just hung for {time}!\nThat's {tier} level grip strength 💪\n\n{hashtags}\n\nSubmit your hang: worlddeadhang.com/submit`,
      
      MILESTONE: `🏆 MILESTONE ACHIEVED!\n\n{name} has reached the {tier} tier with {time}!\nIncredible dedication to grip strength! 👏\n\n{hashtags}\n\nJoin them: worlddeadhang.com/submit`,
      
      WELCOME: `👋 Welcome to WDHC, {name}!\n\nYour {time} hang puts you in the {tier} tier!\nCan't wait to see your progress! 🚀\n\n{hashtags}\n\nTrack your ranking: worlddeadhang.com/leaderboard`
    },
    
    // Hashtag groups
    HASHTAGS: {
      BASE: ['#WDHC', '#WorldDeadHang', '#GripStrength', '#DeadHang'],
      TIER_PREFIX: '#',
      GENDER: {
        male: '#GripAthlete',
        female: '#WomenWhoHang'
      },
      EXTRA: ['#GripSport', '#Calisthenics', '#GripTraining', '#HangTime']
    },
    
    // Emoji mappings
    EMOJIS: {
      FREAK: '👑',
      LEGEND: '⭐',
      ELITE: '🔥',
      PRO: '💪',
      CONTENDER: '⚡',
      CHALLENGER: '🎯'
    }
  },
  
  // ====================
  // MONITORING & ALERTS
  // ====================
  MONITORING: {
    // Error notifications
    ALERT_CHANNELS: {
      email: 'your-email@example.com',
      slack_webhook: 'YOUR_SLACK_WEBHOOK_URL',
      discord_webhook: 'YOUR_DISCORD_WEBHOOK_URL'
    },
    
    // Performance tracking
    METRICS: {
      track_engagement: true,
      track_submission_growth: true,
      track_conversions: true
    },
    
    // Logging level
    LOG_LEVEL: 'info', // debug, info, warn, error
  },
  
  // ====================
  // SECURITY
  // ====================
  SECURITY: {
    // API rate limiting
    RATE_LIMITS: {
      twitter: {
        posts_per_hour: 10,
        posts_per_day: 50
      },
      google_sheets: {
        reads_per_minute: 60,
        writes_per_minute: 20
      }
    },
    
    // Data privacy
    PRIVACY: {
      anonymize_emails: true,
      hash_identifiers: true,
      retention_days: 90
    }
  },
  
  // ====================
  // DEVELOPMENT
  // ====================
  DEVELOPMENT: {
    // Test mode
    TEST_MODE: false,
    
    // Dry run (don't actually post)
    DRY_RUN: false,
    
    // Test accounts
    TEST_ACCOUNTS: {
      twitter: '@TestWDHC',
      email: 'test@wdhc.com'
    },
    
    // Debug output
    DEBUG: {
      log_raw_data: false,
      log_api_calls: true,
      save_generated_graphics: true
    }
  }
};

// Export for Node.js/Google Apps Script
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}

// For Google Apps Script, we need to wrap in a function
function getConfig() {
  return CONFIG;
}