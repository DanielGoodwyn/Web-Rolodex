package daniel.rolodex.ui.main

import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import daniel.rolodex.R
import daniel.rolodex.data.models.Association
import daniel.rolodex.data.models.Note
import android.widget.EditText
import android.widget.Toast
import android.view.inputmethod.EditorInfo
import daniel.rolodex.databinding.ItemCardBinding

class CardsAdapter(
    private val onCardClick: (Association) -> Unit,
    private val onUpdateRating: (Association, Int) -> Unit,
    private val onEditCard: (Association) -> Unit,
    private val onDeleteCard: (Association) -> Unit,
    private val onAddAssociate: (Association, String) -> Unit,
    private val onUnlinkAssociate: (Association, String) -> Unit,
    private val onAddNote: (Association, String) -> Unit,
    private val onDeleteNote: (Note) -> Unit,
    private val onFindAssociate: (String) -> Unit,
    private val onUpdateLink: (Association, String, String?) -> Unit = { _, _, _ -> }
) : ListAdapter<Association, CardsAdapter.CardViewHolder>(CardDiffCallback()) {

    var allAssociateNames: List<String> = emptyList()
    var allParentAssociationNames: List<String> = emptyList()
    var notesMap: Map<String, List<Note>> = emptyMap()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardViewHolder {
        val binding = ItemCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CardViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CardViewHolder, position: Int) {
        holder.bind(getItem(position), position + 1)
    }

    inner class CardViewHolder(private val binding: ItemCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(card: Association, number: Int) {
            val context = itemView.context

            // Number formatting: 01, 02, etc.
            binding.tvCardNumber.text = String.format("%02d", number)
            binding.tvCardName.text = card.name

            // Rating badge & color
            if (card.isAssociate) {
                binding.tvRatingBadge.visibility = View.GONE
            } else if (card.displayRating > 0) {
                binding.tvRatingBadge.visibility = View.VISIBLE
                binding.tvRatingBadge.text = card.displayRating.toString()
                binding.tvRatingBadge.backgroundTintList = ColorStateList.valueOf(getRatingColor(card.displayRating, context))
            } else {
                binding.tvRatingBadge.visibility = View.VISIBLE
                binding.tvRatingBadge.text = "-"
                binding.tvRatingBadge.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.rating_neutral))
            }

            // Rating click -> dialog
            binding.tvRatingBadge.setOnClickListener {
                val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_rating, null)
                val tvDialogCardName = dialogView.findViewById<android.widget.TextView>(R.id.tvRatingDialogCardName)
                val tvDialogBadge = dialogView.findViewById<android.widget.TextView>(R.id.tvDialogRatingBadge)
                val slider = dialogView.findViewById<com.google.android.material.slider.Slider>(R.id.sliderRating)

                tvDialogCardName.text = card.name
                val currentRating = if (card.displayRating > 0) card.displayRating.toFloat() else 50f
                slider.value = currentRating

                fun updateDialogBadge(v: Int) {
                    tvDialogBadge.text = v.toString()
                    tvDialogBadge.backgroundTintList = ColorStateList.valueOf(getRatingColor(v.toLong(), context))
                }

                updateDialogBadge(currentRating.toInt())

                slider.addOnChangeListener { _, value, _ ->
                    updateDialogBadge(value.toInt())
                }

                dialogView.findViewById<android.view.View>(R.id.btnPreset20).setOnClickListener { slider.value = 20f }
                dialogView.findViewById<android.view.View>(R.id.btnPreset40).setOnClickListener { slider.value = 40f }
                dialogView.findViewById<android.view.View>(R.id.btnPreset60).setOnClickListener { slider.value = 60f }
                dialogView.findViewById<android.view.View>(R.id.btnPreset80).setOnClickListener { slider.value = 80f }
                dialogView.findViewById<android.view.View>(R.id.btnPreset95).setOnClickListener { slider.value = 95f }

                MaterialAlertDialogBuilder(context)
                    .setTitle("Update Rating")
                    .setView(dialogView)
                    .setPositiveButton("Save") { _, _ ->
                        onUpdateRating(card, slider.value.toInt())
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }

            // Edit Card Button
            binding.btnEditCard.setOnClickListener {
                onEditCard(card)
            }

            // Expand / Collapse
            binding.expandableBodyLayout.visibility = if (card.isExpanded) View.VISIBLE else View.GONE
            binding.imgChevron.rotation = if (card.isExpanded) 90f else 0f

            binding.headerLayout.setOnClickListener {
                card.isExpanded = !card.isExpanded
                binding.expandableBodyLayout.visibility = if (card.isExpanded) View.VISIBLE else View.GONE
                binding.imgChevron.animate().rotation(if (card.isExpanded) 90f else 0f).setDuration(200).start()
            }

            // Delete Card
            binding.btnDeleteCard.setOnClickListener {
                MaterialAlertDialogBuilder(context)
                    .setTitle("Delete Card")
                    .setMessage("Are you sure you want to delete ${card.name}?")
                    .setPositiveButton("Delete") { _, _ -> onDeleteCard(card) }
                    .setNegativeButton("Cancel", null)
                    .show()
            }

            // Types Chips
            binding.chipGroupCardTypes.removeAllViews()
            val typesToDisplay = card.allTypes
            for (type in typesToDisplay) {
                val chip = Chip(context).apply {
                    text = type
                    isClickable = false
                    setChipBackgroundColorResource(R.color.chip_associate_bg)
                    setTextColor(ContextCompat.getColor(context, R.color.chip_associate_text))
                }
                binding.chipGroupCardTypes.addView(chip)
            }

            // Location & Google Maps / Apple Maps
            val loc = card.location
            if (!loc.isNullOrBlank()) {
                binding.locationContainer.visibility = View.VISIBLE
                binding.tvLocation.text = loc

                val distStr = card.distanceMiles?.let { String.format("%.1f mi", it) } ?: ""
                val hoodStr = card.neighborhood ?: ""
                val details = listOf(hoodStr, distStr).filter { it.isNotBlank() }.joinToString(" • ")
                binding.tvNeighborhoodAndDistance.text = details

                binding.btnGoogleMaps.setOnClickListener {
                    val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(loc)}")
                    val mapIntent = Intent(Intent.ACTION_VIEW, uri)
                    context.startActivity(mapIntent)
                }

                binding.btnAppleMaps.setOnClickListener {
                    val uri = Uri.parse("https://maps.apple.com/?q=${Uri.encode(loc)}")
                    val mapIntent = Intent(Intent.ACTION_VIEW, uri)
                    context.startActivity(mapIntent)
                }
            } else {
                binding.locationContainer.visibility = View.GONE
            }

            // Links (Web, FB, Insta, X)
            val webUrl = card.websiteUrl
            if (!webUrl.isNullOrBlank()) {
                binding.btnWeb.visibility = View.VISIBLE
                binding.btnWeb.setOnClickListener { openUrl(webUrl, context) }
            } else {
                binding.btnWeb.visibility = View.GONE
            }

            val fbUrl = card.facebookUrl
            if (!fbUrl.isNullOrBlank()) {
                binding.btnFacebook.visibility = View.VISIBLE
                binding.btnFacebook.setOnClickListener { openUrl(fbUrl, context) }
            } else {
                binding.btnFacebook.visibility = View.GONE
            }

            val igUrl = card.instagramUrl
            if (!igUrl.isNullOrBlank()) {
                binding.btnInstagram.visibility = View.VISIBLE
                binding.btnInstagram.setOnClickListener { openUrl(igUrl, context) }
            } else {
                binding.btnInstagram.visibility = View.GONE
            }

            val xUrl = card.twitterUrl
            if (!xUrl.isNullOrBlank()) {
                binding.btnX.visibility = View.VISIBLE
                binding.btnX.setOnClickListener { openUrl(xUrl, context) }
            } else {
                binding.btnX.visibility = View.GONE
            }

            val hasAnyButtons = !webUrl.isNullOrBlank() || !fbUrl.isNullOrBlank() || !igUrl.isNullOrBlank() || !xUrl.isNullOrBlank()
            binding.linksButtonsScroll.visibility = if (hasAnyButtons) View.VISIBLE else View.GONE

            // Pre-fill inputs when not actively focused
            if (!binding.etLinkWeb.hasFocus()) {
                binding.etLinkWeb.setText(webUrl.orEmpty())
            }
            if (!binding.etLinkFb.hasFocus()) {
                binding.etLinkFb.setText(fbUrl.orEmpty())
            }
            if (!binding.etLinkIg.hasFocus()) {
                binding.etLinkIg.setText(igUrl.orEmpty())
            }
            if (!binding.etLinkX.hasFocus()) {
                binding.etLinkX.setText(xUrl.orEmpty())
            }

            fun setupLinkInput(editText: EditText, currentVal: String?, type: String) {
                editText.setOnFocusChangeListener { _, hasFocus ->
                    if (!hasFocus) {
                        val newText = editText.text.toString().trim()
                        if (newText != (currentVal ?: "")) {
                            onUpdateLink(card, type, newText.ifEmpty { null })
                        }
                    }
                }
                editText.setOnEditorActionListener { _, actionId, _ ->
                    if (actionId == EditorInfo.IME_ACTION_DONE) {
                        editText.clearFocus()
                        val newText = editText.text.toString().trim()
                        if (newText != (currentVal ?: "")) {
                            onUpdateLink(card, type, newText.ifEmpty { null })
                        }
                        true
                    } else false
                }
            }

            setupLinkInput(binding.etLinkWeb, webUrl, "site")
            setupLinkInput(binding.etLinkFb, fbUrl, "fb")
            setupLinkInput(binding.etLinkIg, igUrl, "ig")
            setupLinkInput(binding.etLinkX, xUrl, "twitter")

            // Associates / Associated With
            if (card.isAssociate) {
                binding.tvAssociatesTitle.text = context.getString(R.string.associated_with_title)
                binding.etNewAssociate.hint = context.getString(R.string.link_association_hint)
                val adapter = ArrayAdapter(context, android.R.layout.simple_dropdown_item_1line, allParentAssociationNames)
                binding.etNewAssociate.setAdapter(adapter)

                binding.chipGroupAssociates.removeAllViews()
                for ((parentId, parentName) in card.linkedParentNames) {
                    val chip = Chip(context).apply {
                        text = parentName
                        isCloseIconVisible = true
                        setCloseIconResource(R.drawable.ic_glyph_close)
                        setChipBackgroundColorResource(R.color.chip_associate_bg)
                        setTextColor(ContextCompat.getColor(context, R.color.chip_associate_text))
                        closeIconTint = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.chip_associate_text))
                        setOnCloseIconClickListener { onUnlinkAssociate(card, parentId) }
                        setOnClickListener { onFindAssociate(parentName) }
                    }
                    binding.chipGroupAssociates.addView(chip)
                }
            } else {
                binding.tvAssociatesTitle.text = context.getString(R.string.associates_title)
                binding.etNewAssociate.hint = context.getString(R.string.add_associate_hint)
                val adapter = ArrayAdapter(context, android.R.layout.simple_dropdown_item_1line, allAssociateNames)
                binding.etNewAssociate.setAdapter(adapter)

                binding.chipGroupAssociates.removeAllViews()
                for ((assocId, assocName) in card.linkedAssociateNames) {
                    val chip = Chip(context).apply {
                        text = assocName
                        isCloseIconVisible = true
                        setCloseIconResource(R.drawable.ic_glyph_close)
                        setChipBackgroundColorResource(R.color.chip_associate_bg)
                        setTextColor(ContextCompat.getColor(context, R.color.chip_associate_text))
                        closeIconTint = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.chip_associate_text))
                        setOnCloseIconClickListener { onUnlinkAssociate(card, assocId) }
                        setOnClickListener { onFindAssociate(assocName) }
                    }
                    binding.chipGroupAssociates.addView(chip)
                }
            }

            binding.btnAddAssociate.setOnClickListener {
                val inputName = binding.etNewAssociate.text.toString().trim()
                if (inputName.isNotEmpty()) {
                    onAddAssociate(card, inputName)
                    binding.etNewAssociate.setText("")
                }
            }

            // Notes
            val notes = notesMap[card.id] ?: emptyList()
            val notesAdapter = NotesAdapter(onDeleteNote)
            binding.recyclerViewNotes.layoutManager = LinearLayoutManager(context)
            binding.recyclerViewNotes.adapter = notesAdapter
            notesAdapter.submitList(notes)

            binding.btnAddNote.setOnClickListener {
                val noteText = binding.etNewNote.text.toString().trim()
                if (noteText.isNotEmpty()) {
                    onAddNote(card, noteText)
                    binding.etNewNote.setText("")
                }
            }
        }

        private fun openUrl(url: String?, context: Context) {
            if (url.isNullOrBlank()) return
            var finalUrl = url.trim()
            if (!finalUrl.startsWith("http://", ignoreCase = true) && !finalUrl.startsWith("https://", ignoreCase = true)) {
                finalUrl = "https://$finalUrl"
            }
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(finalUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(context, "Could not open link: $finalUrl", Toast.LENGTH_SHORT).show()
            }
        }

        private fun getRatingColor(rating: Long, context: Context): Int {
            return when {
                rating >= 91 -> ContextCompat.getColor(context, R.color.rating_excellent)
                rating >= 80 -> ContextCompat.getColor(context, R.color.rating_great)
                rating >= 60 -> ContextCompat.getColor(context, R.color.rating_good)
                rating >= 40 -> ContextCompat.getColor(context, R.color.rating_average)
                rating >= 20 -> ContextCompat.getColor(context, R.color.rating_poor)
                rating > 0 -> ContextCompat.getColor(context, R.color.rating_bad)
                else -> ContextCompat.getColor(context, R.color.rating_neutral)
            }
        }
    }

    class CardDiffCallback : DiffUtil.ItemCallback<Association>() {
        override fun areItemsTheSame(oldItem: Association, newItem: Association): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Association, newItem: Association): Boolean {
            return oldItem == newItem &&
                    oldItem.isExpanded == newItem.isExpanded &&
                    oldItem.linkedAssociateNames == newItem.linkedAssociateNames &&
                    oldItem.linkedParentNames == newItem.linkedParentNames &&
                    oldItem.distanceMiles == newItem.distanceMiles
        }
    }
}
