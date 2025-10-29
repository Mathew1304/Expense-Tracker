/**
 * Utility script to clean up orphaned auth users
 * Run this script when users report "email already registered" errors
 * 
 * Usage: node cleanup-orphaned-users.js
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lsfjafgbus1jxcaqfzmv.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required')
  process.exit(1)
}

async function cleanupOrphanedUsers() {
  try {
    console.log('🧹 Starting cleanup of orphaned auth users...')
    console.log('📡 Calling cleanup function...')
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/cleanup-orphaned-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Cleanup failed:', errorText)
      return
    }

    const result = await response.json()
    
    if (result.success) {
      console.log('✅', result.message)
      if (result.cleaned > 0) {
        console.log(`🗑️ Cleaned up ${result.cleaned} orphaned users`)
      }
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️ Some errors occurred:')
        result.errors.forEach(error => console.log('  -', error))
      }
    } else {
      console.error('❌ Cleanup failed:', result.error)
    }
  } catch (error) {
    console.error('❌ Error running cleanup:', error.message)
  }
}

// Run the cleanup
cleanupOrphanedUsers()
