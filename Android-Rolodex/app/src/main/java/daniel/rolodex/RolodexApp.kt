package daniel.rolodex

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings

class RolodexApp : Application() {
    override fun onCreate() {
        super.onCreate()

        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)

        if (FirebaseApp.getApps(this).isEmpty()) {
            val options = FirebaseOptions.Builder()
                .setApplicationId("1:119025024991:android:3ef186103488998c962c58")
                .setApiKey("AIzaSyBpsdl5rHyL0_mbauMUQVgD89zs7E9eY1U")
                .setProjectId("rolodex-ade98")
                .setStorageBucket("rolodex-ade98.firebasestorage.app")
                .setGcmSenderId("119025024991")
                .build()
            FirebaseApp.initializeApp(this, options)
        }

        try {
            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            FirebaseFirestore.getInstance().firestoreSettings = settings
        } catch (e: Exception) {
            // Already initialized
        }
    }
}
