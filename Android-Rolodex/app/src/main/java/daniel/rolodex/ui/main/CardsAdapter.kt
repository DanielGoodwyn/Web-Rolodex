package daniel.rolodex.ui.main

import android.content.Context
import android.content.Intent
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
import daniel.rolodex.databinding.ItemCardBinding

class CardsAdapter(
    private val onCardClick: (Association) -> Unit,
    private val onDeleteCard: (Association) -> Unit,
    private val onAddAssociate: (Association, String) -> Unit,
    private val onUnlinkAssociate: (Association, String) -> Unit,
    private val onAddNote: (Association, String) -> Unit,
    private val onDeleteNote: (Note) -> Unit,
    private val onFindAssociate: (String) -> Unit
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
            binding.tvRatingBadge.text = card.rating.toString()
            binding.tvRatingBadge.setBackgroundColor(getRatingColor(card.rating, context))

            // Expand / Collapse
            binding.expandableBodyLayout.visibility = if (card.isExpanded) View.VISIBLE else View.GONE
            binding.imgChevron.rotation = if (card.isExpanded) 180f else 0f

            binding.headerLayout.setOnClickListener {
                card.isExpanded = !card.isExpanded
                binding.expandableBodyLayout.visibility = if (card.isExpanded) View.VISIBLE else View.GONE
                binding.imgChevron.animate().rotation(if (card.isExpanded) 180f else 0f).setDuration(200).start()
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
                    setChipBackgroundColorResource(R.color.primary_light)
                    setTextColor(ContextCompat.getColor(context, R.color.primary_dark))
                }
                binding.chipGroupCardTypes.addView(chip)
            }

            // Location & Google Maps
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
            } else {
                binding.locationContainer.visibility = View.GONE
            }

            // Links (Web, FB, Insta, X)
            var hasLinks = false
            if (!card.web.isNullOrBlank()) {
                binding.btnWeb.visibility = View.VISIBLE
                binding.btnWeb.setOnClickListener { openUrl(card.web, context) }
                hasLinks = true
            } else binding.btnWeb.visibility = View.GONE

            if (!card.facebook.isNullOrBlank()) {
                binding.btnFacebook.visibility = View.VISIBLE
                binding.btnFacebook.setOnClickListener { openUrl(card.facebook, context) }
                hasLinks = true
            } else binding.btnFacebook.visibility = View.GONE

            if (!card.instagram.isNullOrBlank()) {
                binding.btnInstagram.visibility = View.VISIBLE
                binding.btnInstagram.setOnClickListener { openUrl(card.instagram, context) }
                hasLinks = true
            } else binding.btnInstagram.visibility = View.GONE

            if (!card.twitter.isNullOrBlank()) {
                binding.btnX.visibility = View.VISIBLE
                binding.btnX.setOnClickListener { openUrl(card.twitter, context) }
                hasLinks = true
            } else binding.btnX.visibility = View.GONE

            binding.linksContainer.visibility = if (hasLinks) View.VISIBLE else View.GONE

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
            if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
                finalUrl = "https://$finalUrl"
            }
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(finalUrl)))
            } catch (e: Exception) {
                // Ignore
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
