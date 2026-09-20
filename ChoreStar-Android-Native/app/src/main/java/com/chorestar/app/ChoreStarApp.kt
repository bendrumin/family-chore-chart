package com.chorestar.app

import android.app.Application
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.SupabaseModule

/** Owns the one Supabase client and repository for the process. */
class ChoreStarApp : Application() {
    lateinit var repository: ChoreStarRepository
        private set

    override fun onCreate() {
        super.onCreate()
        repository = ChoreStarRepository(SupabaseModule.client(), SupabaseModule.webClient())
    }
}
