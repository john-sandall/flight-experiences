import experiencesData from './data/experiences.json';

// State
let experiences = experiencesData.experiences;
let airfields = experiencesData.airfields;
let filteredExperiences = [...experiences];
let map = null;
let markers = {};
let homeMarker = null;
let selectedCardId = null;

// Filter state
let filters = {
  budget: 500,
  showOverBudget: false,
  duration: 'any',
  aerobatics: 'any',
  type: 'any',
  drive: 'any',
  landmarks: 'any',
  sort: 'price-asc'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initFilters();
  initMobileControls();
  renderCards();
  renderMapMarkers();
});

// Initialize mobile controls
function initMobileControls() {
  const toggleFilters = document.getElementById('toggle-filters');
  const toggleView = document.getElementById('toggle-view');
  const filtersPanel = document.getElementById('filters-panel');
  const mapContainer = document.querySelector('.map-container');
  const cardsContainer = document.querySelector('.cards-container');

  // Toggle filters panel
  toggleFilters.addEventListener('click', () => {
    filtersPanel.classList.toggle('show');
    toggleFilters.classList.toggle('active');
  });

  // Toggle between map and list view
  toggleView.addEventListener('click', () => {
    const showingMap = mapContainer.classList.contains('show');

    if (showingMap) {
      // Switch to list view
      mapContainer.classList.remove('show');
      cardsContainer.classList.remove('hide');
      toggleView.innerHTML = '<span class="map-icon">🗺</span> Map';
      toggleView.classList.remove('active');
    } else {
      // Switch to map view
      mapContainer.classList.add('show');
      cardsContainer.classList.add('hide');
      toggleView.innerHTML = '<span class="list-icon">📋</span> List';
      toggleView.classList.add('active');
      // Invalidate map size and fit bounds after showing
      setTimeout(() => {
        map.invalidateSize();
        if (filteredExperiences.length > 0) {
          const bounds = L.latLngBounds(
            filteredExperiences.map(exp => [exp.coordinates.lat, exp.coordinates.lng])
          );
          const home = airfields.find(a => a.isHome);
          if (home) {
            bounds.extend([home.lat, home.lng]);
          }
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }, 150);
    }
  });
}

// Initialize Leaflet map
function initMap() {
  // Center on Southeast England
  map = L.map('map').setView([51.15, -0.1], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add home marker (Brighton)
  const home = airfields.find(a => a.isHome);
  if (home) {
    const homeIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="home-marker">🏠</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    homeMarker = L.marker([home.lat, home.lng], { icon: homeIcon })
      .addTo(map)
      .bindPopup(`<div class="popup-title">${home.name}</div><div class="popup-info">Starting point</div>`);
  }
}

// Render map markers for filtered experiences
function renderMapMarkers() {
  // Clear existing markers
  Object.values(markers).forEach(marker => map.removeLayer(marker));
  markers = {};

  // Group experiences by location
  const locationGroups = {};
  filteredExperiences.forEach(exp => {
    const key = `${exp.coordinates.lat},${exp.coordinates.lng}`;
    if (!locationGroups[key]) {
      locationGroups[key] = [];
    }
    locationGroups[key].push(exp);
  });

  // Create markers
  Object.entries(locationGroups).forEach(([key, exps]) => {
    const [lat, lng] = key.split(',').map(Number);

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="airfield-marker">${exps.length > 1 ? exps.length : '✈'}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const popupContent = exps.map(exp =>
      `<div class="popup-item" data-id="${exp.id}">
        <div class="popup-title">${exp.name}</div>
        <div class="popup-info">£${exp.price} · ${exp.duration} min</div>
      </div>`
    ).join('<hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">');

    const marker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(popupContent);

    // Store marker reference for each experience at this location
    exps.forEach(exp => {
      markers[exp.id] = marker;
    });

    // Handle popup clicks
    marker.on('popupopen', () => {
      document.querySelectorAll('.popup-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          const id = parseInt(item.dataset.id);
          highlightCard(id);
          scrollToCard(id);
        });
      });
    });
  });

  // Fit bounds if we have markers
  if (filteredExperiences.length > 0) {
    const bounds = L.latLngBounds(
      filteredExperiences.map(exp => [exp.coordinates.lat, exp.coordinates.lng])
    );
    // Include home in bounds
    const home = airfields.find(a => a.isHome);
    if (home) {
      bounds.extend([home.lat, home.lng]);
    }
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Initialize filter controls
function initFilters() {
  // Budget slider
  const budgetSlider = document.getElementById('budget-slider');
  const budgetValue = document.getElementById('budget-value');
  budgetSlider.addEventListener('input', (e) => {
    filters.budget = parseInt(e.target.value);
    budgetValue.textContent = `£${filters.budget}`;
    applyFilters();
  });

  // Show over budget checkbox
  document.getElementById('show-over-budget').addEventListener('change', (e) => {
    filters.showOverBudget = e.target.checked;
    applyFilters();
  });

  // Duration filter
  document.getElementById('duration-filter').addEventListener('change', (e) => {
    filters.duration = e.target.value;
    applyFilters();
  });

  // Aerobatics filter
  document.getElementById('aerobatics-filter').addEventListener('change', (e) => {
    filters.aerobatics = e.target.value;
    applyFilters();
  });

  // Type filter
  document.getElementById('type-filter').addEventListener('change', (e) => {
    filters.type = e.target.value;
    applyFilters();
  });

  // Drive time filter
  document.getElementById('drive-filter').addEventListener('change', (e) => {
    filters.drive = e.target.value;
    applyFilters();
  });

  // Landmarks filter
  document.getElementById('landmarks-filter').addEventListener('change', (e) => {
    filters.landmarks = e.target.value;
    applyFilters();
  });

  // Sort select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    filters.sort = e.target.value;
    applyFilters();
  });

  // Reset button
  document.getElementById('reset-filters').addEventListener('click', resetFilters);
}

function resetFilters() {
  filters = {
    budget: 500,
    showOverBudget: false,
    duration: 'any',
    aerobatics: 'any',
    type: 'any',
    drive: 'any',
    landmarks: 'any',
    sort: 'price-asc'
  };

  // Reset UI
  document.getElementById('budget-slider').value = 500;
  document.getElementById('budget-value').textContent = '£500';
  document.getElementById('show-over-budget').checked = false;
  document.getElementById('duration-filter').value = 'any';
  document.getElementById('aerobatics-filter').value = 'any';
  document.getElementById('type-filter').value = 'any';
  document.getElementById('drive-filter').value = 'any';
  document.getElementById('landmarks-filter').value = 'any';
  document.getElementById('sort-select').value = 'price-asc';

  applyFilters();
}

function applyFilters() {
  filteredExperiences = experiences.filter(exp => {
    // Budget filter
    if (!filters.showOverBudget && exp.price > filters.budget) {
      return false;
    }

    // Duration filter
    if (filters.duration !== 'any') {
      if (filters.duration === 'under30' && exp.duration >= 30) return false;
      if (filters.duration === '30-60' && (exp.duration < 30 || exp.duration > 60)) return false;
      if (filters.duration === '60+' && exp.duration < 60) return false;
    }

    // Aerobatics filter
    if (filters.aerobatics !== 'any') {
      if (filters.aerobatics === 'yes' && !exp.hasAerobatics) return false;
      if (filters.aerobatics === 'no' && exp.hasAerobatics) return false;
    }

    // Type filter
    if (filters.type !== 'any' && exp.aircraftType !== filters.type) {
      return false;
    }

    // Drive time filter
    if (filters.drive !== 'any') {
      const driveOrder = ['under30', 'under1hr', 'under2hr', 'under3hr'];
      const expIndex = driveOrder.indexOf(exp.driveCategory);
      const filterIndex = driveOrder.indexOf(filters.drive);
      if (expIndex > filterIndex) return false;
    }

    // Landmarks filter
    if (filters.landmarks !== 'any') {
      if (!exp.landmarks.includes(filters.landmarks)) return false;
    }

    return true;
  });

  // Sort
  sortExperiences();

  // Update UI
  renderCards();
  renderMapMarkers();
  updateResultsCount();
}

function sortExperiences() {
  filteredExperiences.sort((a, b) => {
    switch (filters.sort) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'cost-per-min-asc':
        return a.costPerMin - b.costPerMin;
      case 'duration-asc':
        return a.duration - b.duration;
      case 'duration-desc':
        return b.duration - a.duration;
      case 'drive-asc':
        return a.driveTime - b.driveTime;
      case 'drive-desc':
        return b.driveTime - a.driveTime;
      default:
        return 0;
    }
  });
}

function updateResultsCount() {
  const count = filteredExperiences.length;
  document.getElementById('results-count').textContent =
    `${count} experience${count !== 1 ? 's' : ''}`;
}

// Render experience cards
function renderCards() {
  const container = document.getElementById('cards-list');

  if (filteredExperiences.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No experiences match your filters</h3>
        <p>Try adjusting your filters to see more options</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredExperiences.map(exp => createCardHTML(exp)).join('');

  // Add click handlers
  container.querySelectorAll('.experience-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      openModal(id);
    });

    card.addEventListener('mouseenter', () => {
      const id = parseInt(card.dataset.id);
      highlightMarker(id);
    });

    card.addEventListener('mouseleave', () => {
      unhighlightMarker();
    });
  });
}

function createCardHTML(exp) {
  const isOverBudget = exp.price > filters.budget;

  return `
    <article class="experience-card ${isOverBudget ? 'over-budget' : ''}" data-id="${exp.id}">
      <img
        class="card-image"
        src="${exp.imageUrl}"
        alt="${exp.aircraft}"
        loading="lazy"
        onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.style.display='flex'; this.alt=''"
      >
      <div class="card-content">
        <div class="card-header">
          <h3 class="card-title">${exp.name}</h3>
          <span class="card-price">£${exp.price}</span>
        </div>
        <p class="card-aircraft">${exp.aircraft}</p>
        <div class="card-meta">
          <span class="meta-badge">⏱ ${exp.duration} min</span>
          <span class="meta-badge">£${exp.costPerMin.toFixed(2)}/min</span>
          ${exp.hasAerobatics ? '<span class="meta-badge aerobatics">🔄 Aerobatics</span>' : ''}
          ${exp.canTakeControls ? '<span class="meta-badge controls">🎮 Take Controls</span>' : ''}
          ${isOverBudget ? '<span class="meta-badge over-budget">Over Budget</span>' : ''}
        </div>
        <p class="card-landmarks">📍 ${exp.landmarksList}</p>
        <div class="card-footer">
          <span class="card-operator">${exp.operator}</span>
          <span class="card-drive">🚗 ${exp.driveTime} min drive</span>
        </div>
      </div>
    </article>
  `;
}

// Card and marker interaction
function highlightCard(id) {
  document.querySelectorAll('.experience-card').forEach(card => {
    card.classList.remove('highlighted');
  });
  const card = document.querySelector(`.experience-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('highlighted');
  }
  selectedCardId = id;
}

function scrollToCard(id) {
  const card = document.querySelector(`.experience-card[data-id="${id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function highlightMarker(id) {
  const marker = markers[id];
  if (marker) {
    marker.openPopup();
  }
}

function unhighlightMarker() {
  // Close all popups except if a card is selected
  if (!selectedCardId) {
    Object.values(markers).forEach(marker => marker.closePopup());
  }
}

function panToMarker(id) {
  const exp = experiences.find(e => e.id === id);
  if (exp && markers[id]) {
    map.panTo([exp.coordinates.lat, exp.coordinates.lng], { animate: true });
    markers[id].openPopup();
  }
}

// Modal
function openModal(id) {
  const exp = experiences.find(e => e.id === id);
  if (!exp) return;

  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');

  modalBody.innerHTML = `
    <img class="modal-image" src="${exp.imageUrl}" alt="${exp.aircraft}"
         onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.alt=''">
    <div class="modal-body">
      <h2 class="modal-title">${exp.name}</h2>
      <p class="modal-aircraft">${exp.aircraft}</p>

      <div class="modal-details">
        <div class="detail-item">
          <div class="detail-label">Price</div>
          <div class="detail-value">£${exp.price}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${exp.duration} minutes</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Cost per minute</div>
          <div class="detail-value">£${exp.costPerMin.toFixed(2)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Drive from Brighton</div>
          <div class="detail-value">${exp.driveTime} minutes</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Aerobatics</div>
          <div class="detail-value">${exp.hasAerobatics ? 'Yes ✓' : 'No'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Take Controls</div>
          <div class="detail-value">${exp.canTakeControls ? 'Yes ✓' : 'No'}</div>
        </div>
      </div>

      <div class="modal-landmarks">
        <h4>Landmarks & Sights</h4>
        <p>${exp.landmarksList}</p>
      </div>

      <div class="modal-notes">
        <strong>Notes:</strong> ${exp.notes}
      </div>

      <div style="margin-bottom: 12px; color: #717171; font-size: 13px;">
        <strong>Location:</strong> ${exp.location}<br>
        <strong>Operator:</strong> ${exp.operator}<br>
        <strong>Availability:</strong> ${exp.availability}
      </div>

      <a href="${exp.website}" target="_blank" rel="noopener noreferrer" class="modal-cta">
        Visit Website →
      </a>

      <p style="margin-top: 12px; font-size: 11px; color: #999; text-align: center;">
        Image: ${exp.imageCredit}
      </p>
    </div>
  `;

  modal.classList.remove('hidden');

  // Pan to marker on map
  panToMarker(id);
  highlightCard(id);

  // Close handlers
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  selectedCardId = null;
  document.querySelectorAll('.experience-card').forEach(card => {
    card.classList.remove('highlighted');
  });
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
