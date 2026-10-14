package daniel.rolodex.ui.main

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.chip.Chip
import daniel.rolodex.R
import daniel.rolodex.data.location.LocationHelper
import daniel.rolodex.data.models.Association
import daniel.rolodex.data.models.Note
import daniel.rolodex.data.repository.AuthRepository
import daniel.rolodex.data.repository.RolodexRepository
import daniel.rolodex.databinding.ActivityMainBinding
import daniel.rolodex.ui.account.AccountActivity
import daniel.rolodex.ui.auth.LoginActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val authRepository = AuthRepository()
    private val repository = RolodexRepository()
    private lateinit var locationHelper: LocationHelper

    private lateinit var adapter: CardsAdapter
    private var allCards: List<Association> = emptyList()
    private var currentFilterType: String = "ALL" // "ALL", "ALL_ASSOCIATIONS", "ALL_ASSOCIATES", or custom type
    private var searchQuery: String = ""
    private var sortOrder: SortOrder = SortOrder.DISTANCE_ASC
    private var userLocation: Location? = null
    private var notesCache: MutableMap<String, List<Note>> = mutableMapOf()

    enum class SortOrder {
        DISTANCE_ASC,
        DISTANCE_DESC,
        RATING_DESC,
        NAME_ASC,
        NEWEST
    }

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        ) {
            fetchUserLocation()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val currentUser = authRepository.currentUser
        if (currentUser == null) {
            navigateToLogin()
            return
        }

        locationHelper = LocationHelper(this)

        setupToolbar()
        setupRecyclerView()
        setupSearchView()
        setupFilterChips()
        setupFAB()

        requestLocationPermissions()
        observeCards(currentUser.uid)
    }

    private fun setupToolbar() {
        binding.toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.action_account -> {
                    startActivity(Intent(this, AccountActivity::class.java))
                    true
                }
                R.id.sort_distance_asc -> {
                    sortOrder = SortOrder.DISTANCE_ASC
                    applyFilterAndSort()
                    true
                }
                R.id.sort_distance_desc -> {
                    sortOrder = SortOrder.DISTANCE_DESC
                    applyFilterAndSort()
                    true
                }
                R.id.sort_rating_desc -> {
                    sortOrder = SortOrder.RATING_DESC
                    applyFilterAndSort()
                    true
                }
                R.id.sort_name_asc -> {
                    sortOrder = SortOrder.NAME_ASC
                    applyFilterAndSort()
                    true
                }
                R.id.sort_newest -> {
                    sortOrder = SortOrder.NEWEST
                    applyFilterAndSort()
                    true
                }
                else -> false
            }
        }
    }

    private fun setupRecyclerView() {
        adapter = CardsAdapter(
            onCardClick = {},
            onDeleteCard = { card ->
                lifecycleScope.launch {
                    try {
                        repository.deleteCard(card.id)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            onAddAssociate = { card, name ->
                val uid = authRepository.currentUser?.uid ?: return@CardsAdapter
                lifecycleScope.launch {
                    try {
                        repository.linkAssociateToAssociation(name, card.id, uid)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            onUnlinkAssociate = { card, linkedId ->
                lifecycleScope.launch {
                    try {
                        if (card.isAssociate) {
                            repository.unlinkAssociate(card.id, linkedId)
                        } else {
                            repository.unlinkAssociate(linkedId, card.id)
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            onAddNote = { card, noteText ->
                val uid = authRepository.currentUser?.uid ?: return@CardsAdapter
                lifecycleScope.launch {
                    try {
                        repository.addNote(card.id, uid, "General", noteText)
                        loadNotesForCard(card.id, uid)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            onDeleteNote = { note ->
                lifecycleScope.launch {
                    try {
                        repository.deleteNote(note.id)
                        val uid = authRepository.currentUser?.uid ?: return@launch
                        loadNotesForCard(note.associationId, uid)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            onFindAssociate = { name ->
                binding.searchView.setQuery(name, true)
            }
        )

        binding.recyclerViewCards.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewCards.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener {
            fetchUserLocation()
            authRepository.currentUser?.uid?.let { loadAllNotes(it) }
            binding.swipeRefresh.isRefreshing = false
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                searchQuery = query.orEmpty()
                applyFilterAndSort()
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                searchQuery = newText.orEmpty()
                applyFilterAndSort()
                return true
            }
        })
    }

    private fun setupFilterChips() {
        binding.chipGroupFilters.setOnCheckedStateChangeListener { _, checkedIds ->
            currentFilterType = when {
                checkedIds.contains(R.id.chipAll) -> "ALL"
                checkedIds.contains(R.id.chipAssociations) -> "ALL_ASSOCIATIONS"
                checkedIds.contains(R.id.chipAssociates) -> "ALL_ASSOCIATES"
                else -> {
                    val checkedChip = findViewById<Chip>(checkedIds.firstOrNull() ?: View.NO_ID)
                    checkedChip?.text?.toString() ?: "ALL"
                }
            }
            applyFilterAndSort()
        }
    }

    private fun setupFAB() {
        binding.fabAddCard.setOnClickListener {
            val bottomSheet = AddCardBottomSheet { newCard ->
                val uid = authRepository.currentUser?.uid ?: return@AddCardBottomSheet
                newCard.userId = uid
                lifecycleScope.launch {
                    try {
                        val loc = newCard.location
                        if (!loc.isNullOrBlank()) {
                            val coords = locationHelper.geocodeAddress(loc)
                            if (coords != null) {
                                newCard.neighborhood = locationHelper.reverseGeocodeNeighborhood(coords.first, coords.second)
                            }
                        }
                        repository.addCard(newCard)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error adding card: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            bottomSheet.show(supportFragmentManager, AddCardBottomSheet.TAG)
        }
    }

    private fun observeCards(userId: String) {
        binding.mainProgressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            repository.getAssociationsFlow(userId)
                .catch { e ->
                    binding.mainProgressBar.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "Error loading cards: ${e.message}", Toast.LENGTH_LONG).show()
                }
                .collect { list ->
                    binding.mainProgressBar.visibility = View.GONE
                    allCards = list
                    loadAllNotes(userId)
                    populateDynamicTypeChips(userId)
                    updateAssociateLookups()
                    applyFilterAndSort()
                }
        }
    }

    private fun updateAssociateLookups() {
        val associateCards = allCards.filter { it.isAssociate }
        val orgCards = allCards.filter { !it.isAssociate }

        adapter.allAssociateNames = associateCards.map { it.name }.distinct().sorted()
        adapter.allParentAssociationNames = orgCards.map { it.name }.distinct().sorted()

        val orgMap = orgCards.associateBy { it.id }
        val assocMap = associateCards.associateBy { it.id }

        for (card in allCards) {
            if (card.isAssociate) {
                val pIds = card.associationIds.ifEmpty {
                    card.associationId?.let { listOf(it) } ?: emptyList()
                }
                card.linkedParentNames = pIds.mapNotNull { pid ->
                    orgMap[pid]?.name?.let { Pair(pid, it) }
                }
            } else {
                val linkedAssocs = associateCards.filter { a ->
                    val aIds = a.associationIds.ifEmpty {
                        a.associationId?.let { listOf(it) } ?: emptyList()
                    }
                    aIds.contains(card.id)
                }
                card.linkedAssociateNames = linkedAssocs.map { Pair(it.id, it.name) }
            }
        }
    }

    private fun loadAllNotes(userId: String) {
        lifecycleScope.launch {
            for (card in allCards) {
                loadNotesForCard(card.id, userId)
            }
        }
    }

    private suspend fun loadNotesForCard(cardId: String, userId: String) {
        try {
            val notes = repository.getNotesForAssociation(cardId, userId)
            notesCache[cardId] = notes
            adapter.notesMap = notesCache.toMap()
            withContext(Dispatchers.Main) {
                adapter.notifyDataSetChanged()
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun populateDynamicTypeChips(userId: String) {
        lifecycleScope.launch {
            try {
                val types = repository.getUserTypes(userId).filter { it != "associate" }
                withContext(Dispatchers.Main) {
                    for (t in types) {
                        val exists = (0 until binding.chipGroupFilters.childCount).any { idx ->
                            (binding.chipGroupFilters.getChildAt(idx) as? Chip)?.text == t
                        }
                        if (!exists) {
                            val chip = Chip(this@MainActivity).apply {
                                text = t
                                isCheckable = true
                            }
                            binding.chipGroupFilters.addView(chip)
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore
            }
        }
    }

    private fun applyFilterAndSort() {
        var filtered = allCards

        // 1. Category Filter
        filtered = when (currentFilterType) {
            "ALL" -> filtered
            "ALL_ASSOCIATIONS" -> filtered.filter { !it.isAssociate }
            "ALL_ASSOCIATES" -> filtered.filter { it.isAssociate }
            else -> filtered.filter { it.allTypes.contains(currentFilterType) }
        }

        // 2. Search Query Filter
        if (searchQuery.isNotBlank()) {
            val q = searchQuery.trim().lowercase()
            filtered = filtered.filter { card ->
                card.name.lowercase().contains(q) ||
                        card.location?.lowercase()?.contains(q) == true ||
                        card.neighborhood?.lowercase()?.contains(q) == true ||
                        card.linkedAssociateNames.any { it.second.lowercase().contains(q) } ||
                        card.linkedParentNames.any { it.second.lowercase().contains(q) }
            }
        }

        // 3. Compute distances if user location available
        val uLoc = userLocation
        if (uLoc != null) {
            for (card in filtered) {
                // If coordinates or location available, compute distance
                // Note: distanceMiles can be set from geocoded cache
            }
        }

        // 4. Sort
        filtered = when (sortOrder) {
            SortOrder.DISTANCE_ASC -> filtered.sortedBy { it.distanceMiles ?: Double.MAX_VALUE }
            SortOrder.DISTANCE_DESC -> filtered.sortedByDescending { it.distanceMiles ?: -1.0 }
            SortOrder.RATING_DESC -> filtered.sortedByDescending { it.rating }
            SortOrder.NAME_ASC -> filtered.sortedBy { it.name.lowercase() }
            SortOrder.NEWEST -> filtered.sortedByDescending { it.createdAt?.seconds ?: 0L }
        }

        adapter.submitList(filtered)
        binding.emptyStateLayout.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun requestLocationPermissions() {
        val fineLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarseLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)

        if (fineLocation != PackageManager.PERMISSION_GRANTED && coarseLocation != PackageManager.PERMISSION_GRANTED) {
            locationPermissionLauncher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
            )
        } else {
            fetchUserLocation()
        }
    }

    private fun fetchUserLocation() {
        lifecycleScope.launch {
            try {
                val loc = locationHelper.getCurrentLocation()
                if (loc != null) {
                    userLocation = loc
                    val hood = locationHelper.reverseGeocodeNeighborhood(loc.latitude, loc.longitude)
                    if (!hood.isNullOrBlank()) {
                        binding.hoodHeaderLayout.visibility = View.VISIBLE
                        binding.tvCurrentNeighborhood.text = hood
                    }
                    applyFilterAndSort()
                }
            } catch (e: Exception) {
                // Location error
            }
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }
}
