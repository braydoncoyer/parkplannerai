import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Users,
  Coffee,
  Star,
  Clock,
  Footprints,
  ChevronRight,
  ChevronDown,
  Compass,
  Wand2,
  Check
} from 'lucide-react';
import {
  ITINERARY_TEMPLATES,
  CATEGORY_INFO,
  getTemplatesForPark,
  type ItineraryTemplate,
  type TemplateCategory
} from '../../lib/analytics/data/prebuiltItineraries';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  selectedParkId: number | null;
  onSelectTemplate: (template: ItineraryTemplate) => void;
  onSkip: () => void;
}

type ViewMode = 'choice' | 'templates';

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  'first-timer': <Sparkles size={16} />,
  'thrill-seeker': <Zap size={16} />,
  'family': <Users size={16} />,
  'relaxed': <Coffee size={16} />,
  'classic': <Star size={16} />,
};

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: '#22c55e' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  intense: { label: 'Intense', color: '#ef4444' },
};

// ============================================================================
// INITIAL CHOICE SCREEN
// ============================================================================

function PlanTypeChoice({
  onChooseTemplates,
  onChooseCustom
}: {
  onChooseTemplates: () => void;
  onChooseCustom: () => void;
}) {
  return (
    <div className="plan-choice-container">
      {/* Decorative background elements */}
      <div className="choice-bg-orb choice-bg-orb-1" />
      <div className="choice-bg-orb choice-bg-orb-2" />

      <div className="choice-header">
        <h1 className="choice-title">Plan Your Perfect Day</h1>
        <p className="choice-subtitle">
          How would you like to start planning your adventure?
        </p>
      </div>

      <div className="choice-cards">
        {/* Quick Start Card */}
        <button
          className="choice-card choice-card-templates"
          onClick={onChooseTemplates}
          type="button"
        >
          <div className="choice-card-glow" />
          <div className="choice-card-inner">
            <div className="choice-card-icon">
              <Wand2 size={32} strokeWidth={1.5} />
              <div className="icon-sparkles">
                <span className="sparkle sparkle-1">✦</span>
                <span className="sparkle sparkle-2">✦</span>
                <span className="sparkle sparkle-3">✦</span>
              </div>
            </div>

            <div className="choice-card-content">
              <h2 className="choice-card-title">Quick Start</h2>
              <p className="choice-card-description">
                Choose from expertly curated itineraries designed for first-timers,
                thrill seekers, families, and more.
              </p>
            </div>

            <div className="choice-card-features">
              <div className="feature-item">
                <Check size={14} />
                <span>Pre-selected must-do rides</span>
              </div>
              <div className="feature-item">
                <Check size={14} />
                <span>Optimized for your style</span>
              </div>
              <div className="feature-item">
                <Check size={14} />
                <span>Ready in seconds</span>
              </div>
            </div>

            <div className="choice-card-cta">
              <span>Browse Templates</span>
              <ChevronRight size={18} />
            </div>
          </div>
          <div className="choice-card-badge">Popular</div>
        </button>

        {/* Custom Plan Card */}
        <button
          className="choice-card choice-card-custom"
          onClick={onChooseCustom}
          type="button"
        >
          <div className="choice-card-inner">
            <div className="choice-card-icon">
              <Compass size={32} strokeWidth={1.5} />
            </div>

            <div className="choice-card-content">
              <h2 className="choice-card-title">Custom Plan</h2>
              <p className="choice-card-description">
                Build your perfect day from scratch. Choose your park,
                pick your rides, and create a personalized itinerary.
              </p>
            </div>

            <div className="choice-card-features">
              <div className="feature-item">
                <Check size={14} />
                <span>Full control over selections</span>
              </div>
              <div className="feature-item">
                <Check size={14} />
                <span>Advanced strategy options</span>
              </div>
              <div className="feature-item">
                <Check size={14} />
                <span>Park hopper support</span>
              </div>
            </div>

            <div className="choice-card-cta">
              <span>Start Building</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

function TemplateCard({
  template,
  onSelect,
}: {
  template: ItineraryTemplate;
  onSelect: () => void;
}) {
  const difficulty = DIFFICULTY_CONFIG[template.difficulty];
  const categoryInfo = CATEGORY_INFO[template.category];

  return (
    <button
      className="tpl-card"
      onClick={onSelect}
      type="button"
    >
      <div className="tpl-card-header">
        <span className="tpl-card-emoji">{template.icon}</span>
        <div className="tpl-card-badges">
          <span className="tpl-category-pill">
            {CATEGORY_ICONS[template.category]}
            {categoryInfo.label}
          </span>
        </div>
      </div>

      <div className="tpl-card-body">
        <h3 className="tpl-card-title">{template.name}</h3>
        <p className="tpl-card-desc">{template.description}</p>
      </div>

      <div className="tpl-card-meta">
        <div className="tpl-meta-item">
          <Clock size={13} />
          <span>{template.duration === 'full-day' ? 'Full Day' : 'Half Day'}</span>
        </div>
        <div className="tpl-meta-item">
          <Footprints size={13} />
          <span>{template.estimatedWalkingMiles} mi</span>
        </div>
        <div
          className="tpl-meta-item tpl-difficulty"
          style={{ '--diff-color': difficulty.color } as React.CSSProperties}
        >
          <span className="diff-indicator" />
          <span>{difficulty.label}</span>
        </div>
      </div>

      <div className="tpl-card-footer">
        <span className="tpl-rides-count">
          {template.mustDoRides.length} rides included
        </span>
        <span className="tpl-select-cta">
          Select
          <ChevronRight size={14} />
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// TEMPLATE BROWSER
// ============================================================================

function TemplateBrowser({
  selectedParkId,
  onSelectTemplate,
}: {
  selectedParkId: number | null;
  onSelectTemplate: (template: ItineraryTemplate) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get templates, filtered by park if one is selected
  const availableTemplates = useMemo(() => {
    let templates = selectedParkId
      ? getTemplatesForPark(selectedParkId)
      : ITINERARY_TEMPLATES;

    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    return templates;
  }, [selectedParkId, selectedCategory]);

  // Group templates by park for better organization
  const templatesByPark = useMemo(() => {
    const grouped = new Map<string, ItineraryTemplate[]>();

    for (const template of availableTemplates) {
      const existing = grouped.get(template.parkName) || [];
      existing.push(template);
      grouped.set(template.parkName, existing);
    }

    return grouped;
  }, [availableTemplates]);

  const categories = Object.entries(CATEGORY_INFO) as [TemplateCategory, typeof CATEGORY_INFO[TemplateCategory]][];
  const selectedCategoryLabel = selectedCategory === 'all'
    ? 'All Styles'
    : CATEGORY_INFO[selectedCategory].label;

  const handleCategorySelect = (category: TemplateCategory | 'all') => {
    setSelectedCategory(category);
    setFilterOpen(false); // Auto-close on selection
  };

  return (
    <div className="tpl-browser">
      {/* Header */}
      <div className="tpl-browser-header">
        <div className="tpl-header-content">
          <h2 className="tpl-browser-title">
            <Wand2 size={22} />
            Quick Start Templates
          </h2>
          <p className="tpl-browser-subtitle">
            Expert-crafted itineraries to make your day magical
          </p>
        </div>

        {/* Filter dropdown */}
        <div className="tpl-filter-container" ref={filterRef}>
          <button
            className={`tpl-filter-btn ${filterOpen ? 'open' : ''}`}
            onClick={() => setFilterOpen(!filterOpen)}
            type="button"
          >
            {selectedCategory !== 'all' && CATEGORY_ICONS[selectedCategory]}
            <span>{selectedCategoryLabel}</span>
            <ChevronDown size={16} className="filter-chevron" />
          </button>

          {filterOpen && (
            <div className="tpl-filter-dropdown">
              <button
                className={`tpl-filter-option ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('all')}
                type="button"
              >
                <Star size={15} />
                <span>All Styles</span>
                {selectedCategory === 'all' && <Check size={14} className="check-icon" />}
              </button>

              <div className="filter-divider" />

              {categories.map(([key, info]) => (
                <button
                  key={key}
                  className={`tpl-filter-option ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(key)}
                  type="button"
                >
                  {CATEGORY_ICONS[key]}
                  <span>{info.label}</span>
                  {selectedCategory === key && <Check size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Templates */}
      {availableTemplates.length > 0 ? (
        <div className="tpl-content">
          {Array.from(templatesByPark.entries()).map(([parkName, templates], groupIndex) => (
            <div
              key={parkName}
              className="tpl-park-group"
              style={{ '--group-index': groupIndex } as React.CSSProperties}
            >
              <div className="tpl-park-header">
                <h3 className="tpl-park-name">{parkName}</h3>
                <span className="tpl-park-count">{templates.length} templates</span>
              </div>

              <div className="tpl-grid">
                {templates.map((template, index) => (
                  <div
                    key={template.id}
                    className="tpl-card-wrapper"
                    style={{ '--card-index': index } as React.CSSProperties}
                  >
                    <TemplateCard
                      template={template}
                      onSelect={() => onSelectTemplate(template)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tpl-empty">
          <Sparkles size={40} strokeWidth={1.5} />
          <p>No templates match your filter</p>
          <button onClick={() => setSelectedCategory('all')} type="button">
            Show all templates
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TemplateSelector({
  selectedParkId,
  onSelectTemplate,
  onSkip
}: TemplateSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('choice');

  if (viewMode === 'choice') {
    return (
      <PlanTypeChoice
        onChooseTemplates={() => setViewMode('templates')}
        onChooseCustom={onSkip}
      />
    );
  }

  return (
    <TemplateBrowser
      selectedParkId={selectedParkId}
      onSelectTemplate={onSelectTemplate}
    />
  );
}
