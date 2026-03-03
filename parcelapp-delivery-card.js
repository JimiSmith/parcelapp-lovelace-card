class ParcelAppDeliveryCard extends HTMLElement {
  setConfig(config) {
    try {
      this._config = {
        entity: "",
        events_limit: 5,
        show_expected: true,
        show_carrier: true,
        collapsible_events: false,
        layout: "hero",
        show_decorations: true,
        show_progress_rail: true,
        show_route: true,
        action: "more-info",
        accent_color: "#63b8ff",
        card_height: "",
        ...(config || {}),
      };
    } catch (err) {
      this._config = { entity: "" };
      if (this._card) {
        this._card.innerHTML = this._renderError(
          `Invalid card configuration: ${this._toErrorText(err)}`
        );
      }
    }

    if (!this._card) {
      this._card = document.createElement("ha-card");
      this._card.className = "parcelapp-delivery-card";
      this._card.style.background = "transparent";
      this._card.style.boxShadow = "none";
      this._card.style.border = "none";
      this._card.style.padding = "0";
      this._card.style.overflow = "visible";
      this.appendChild(this._card);
    }
  }

  set hass(hass) {
    this._hass = hass;
    try {
      this._render();
    } catch (err) {
      if (this._card) {
        this._card.innerHTML = this._renderError(
          `Card render error: ${this._toErrorText(err)}`
        );
      }
    }
  }

  getCardSize() {
    return this._config?.layout === "compact" ? 4 : 6;
  }

  _render() {
    if (!this._hass || !this._config || !this._card) {
      return;
    }

    if (!this._config.entity) {
      this._card.innerHTML = this._renderError(
        "Waiting for entity binding (use entity: this.entity_id with auto-entities)."
      );
      return;
    }

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) {
      this._card.innerHTML = this._renderError(
        `Entity not found: ${this._config.entity}`
      );
      return;
    }

    const attrs = stateObj.attributes || {};
    if (!attrs.parcelapp_delivery) {
      this._card.innerHTML = this._renderError(
        "Entity is not a ParcelApp delivery sensor."
      );
      return;
    }

    const events = Array.isArray(attrs.events) ? attrs.events : [];
    const eventsLimit = Math.max(1, Number(this._config.events_limit) || 5);
    const visibleEvents = events.slice(0, eventsLimit);
    const route = this._buildRoute(events, attrs);
    const title = this._buildTitle(stateObj, attrs);
    const subtitle = this._buildSubtitle(attrs);
    const expectedChip = this._buildExpectedChip(attrs);
    const stageData = this._mapStatusToStage(attrs.status_code);
    const accent = this._escapeHtml(this._config.accent_color || "#63b8ff");
    const cardHeight = this._config.card_height
      ? `min-height:${this._escapeHtml(String(this._config.card_height))};`
      : "";

    const progressHtml = this._config.show_progress_rail
      ? this._renderProgressRail(stageData)
      : "";

    const routeHtml = this._config.show_route && route
      ? `<div class="route">${this._escapeHtml(route)}</div>`
      : "";

    const eventsHtml = visibleEvents.length
      ? visibleEvents.map((event, idx) => this._renderEvent(event, idx === 0)).join("")
      : '<li class="timeline-empty">No updates yet.</li>';

    const allEventsHtml = this._config.collapsible_events && events.length > eventsLimit
      ? `
        <details class="timeline-more">
          <summary>Show ${events.length} updates</summary>
          <ul class="timeline">${events.map((event, idx) => this._renderEvent(event, idx === 0)).join("")}</ul>
        </details>
      `
      : "";

    const decoClass = this._config.show_decorations ? "show-deco" : "hide-deco";
    const layoutClass = this._config.layout === "compact" ? "compact" : "hero";

    this._card.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .wrap {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          color: #f2f6ff;
          background:
            radial-gradient(45% 90% at 88% 50%, rgba(54, 120, 255, 0.28), transparent 65%),
            radial-gradient(35% 80% at 20% 50%, rgba(42, 74, 181, 0.25), transparent 60%),
            linear-gradient(115deg, #11182a 0%, #151f34 45%, #111a2f 100%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 14px 40px rgba(5, 10, 20, 0.45);
          padding: 22px 26px;
          ${cardHeight}
        }
        .wrap::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(120, 175, 255, 0.18) 1px, transparent 1px);
          background-size: 12px 12px;
          opacity: 0.08;
          pointer-events: none;
        }
        .grid {
          position: relative;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 1px minmax(320px, 1.25fr);
          gap: 20px;
          align-items: stretch;
          z-index: 1;
        }
        .divider {
          background: linear-gradient(to bottom, transparent, rgba(160, 184, 232, 0.45), transparent);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .carrier-badge {
          min-width: 34px;
          max-width: 120px;
          height: 34px;
          border-radius: 9px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #ffd96a;
          background: linear-gradient(140deg, rgba(24, 32, 52, 0.9), rgba(12, 18, 32, 0.8));
          border: 1px solid rgba(255, 219, 103, 0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .title-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .title {
          margin: 0;
          font-size: 1.88rem;
          line-height: 1.1;
          font-weight: 780;
          letter-spacing: 0.01em;
          color: #f6f8ff;
        }
        .subtitle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 4px 12px;
          color: #a9bbde;
          background: rgba(255, 255, 255, 0.07);
          font-size: 0.88rem;
          font-weight: 600;
        }
        .progress {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin: 18px 0 18px;
        }
        .progress::before {
          content: "";
          position: absolute;
          left: 10%;
          right: 10%;
          top: 14px;
          height: 2px;
          background: rgba(141, 165, 210, 0.4);
          z-index: 0;
        }
        .stage {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          color: #7f90b0;
          font-size: 0.82rem;
          text-align: center;
        }
        .stage-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
        }
        .stage.active,
        .stage.done {
          color: #edf4ff;
        }
        .stage.active .stage-dot,
        .stage.done .stage-dot {
          background: rgba(99, 184, 255, 0.18);
          border-color: ${accent};
          box-shadow: 0 0 12px rgba(99, 184, 255, 0.35);
        }
        .route {
          color: #dbe5fb;
          font-size: 0.96rem;
          margin-top: 8px;
        }
        .cta {
          margin-top: 22px;
          border: 1px solid rgba(140, 173, 231, 0.35);
          background: linear-gradient(135deg, rgba(130, 165, 226, 0.14), rgba(90, 129, 206, 0.08));
          color: #cbe2ff;
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 0.95rem;
          font-weight: 640;
          cursor: pointer;
        }
        .cta:hover {
          background: linear-gradient(135deg, rgba(130, 165, 226, 0.22), rgba(90, 129, 206, 0.12));
        }
        .right {
          display: grid;
          align-content: start;
          gap: 12px;
          position: relative;
          min-height: 240px;
        }
        .utility-icons {
          position: absolute;
          right: 10px;
          top: 0;
          display: flex;
          gap: 8px;
          color: #d4e4ff;
          opacity: 0.8;
          font-size: 1.2rem;
        }
        .expected-label {
          color: #9fb0ce;
          font-size: 0.97rem;
          margin-top: 2px;
        }
        .expected-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          border-radius: 999px;
          padding: 9px 14px;
          background: rgba(84, 125, 215, 0.2);
          color: #8ad0ff;
          border: 1px solid rgba(120, 160, 235, 0.33);
          font-size: 1rem;
          font-weight: 700;
        }
        .latest {
          margin-top: 8px;
          color: #a8b8d5;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .timeline {
          position: relative;
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .timeline::before {
          content: "";
          position: absolute;
          left: 6px;
          top: 0.72em;
          bottom: 0.72em;
          width: 2px;
          background: rgba(99, 184, 255, 0.55);
        }
        .timeline li {
          position: relative;
          color: #dce6f8;
          line-height: 1.35;
          font-size: 0.99rem;
          padding-left: 28px;
        }
        .timeline li::before {
          content: "";
          position: absolute;
          left: 6px;
          top: 0.72em;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d9ecff;
          border: 2px solid rgba(99, 184, 255, 0.75);
        }
        .timeline li.latest-item {
          color: #f3f8ff;
          font-weight: 700;
        }
        .timeline-empty {
          color: #8ea0bf;
          border-left: none;
          margin-left: 0;
          padding-left: 28px;
        }
        .timeline-more summary {
          margin-top: 8px;
          color: #a7bce4;
          cursor: pointer;
          font-weight: 600;
        }
        .map-deco {
          position: absolute;
          right: 8px;
          top: 46px;
          width: 170px;
          height: 120px;
          opacity: 0.35;
          background: radial-gradient(circle at 30% 50%, rgba(94, 165, 255, 0.6), transparent 60%);
          filter: blur(2px);
          pointer-events: none;
        }
        .package {
          position: absolute;
          right: 6px;
          top: 72px;
          font-size: 5rem;
          line-height: 1;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
          pointer-events: none;
        }
        .hide-deco .map-deco,
        .hide-deco .package,
        .hide-deco .utility-icons {
          display: none;
        }
        .compact .title {
          font-size: 1.5rem;
        }
        .compact .grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .compact .divider {
          display: none;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .divider {
            display: none;
          }
          .right {
            min-height: unset;
          }
          .package {
            right: 0;
            top: 60px;
            font-size: 4.2rem;
          }
          .progress {
            grid-template-columns: repeat(5, minmax(50px, 1fr));
          }
          .stage {
            font-size: 0.75rem;
          }
        }
        .error {
          padding: 12px 14px;
          color: #b00020;
          font-weight: 600;
        }
      </style>
      <div class="wrap ${decoClass} ${layoutClass}">
        <div class="grid">
          <section class="left">
            <div class="header">
              <span class="carrier-badge">${this._escapeHtml(this._carrierLabel(attrs))}</span>
              <div>
                <h2 class="title">${this._escapeHtml(title)}</h2>
                ${subtitle ? `<span class="subtitle">${this._escapeHtml(subtitle)}</span>` : ""}
              </div>
            </div>
            ${progressHtml}
            ${routeHtml}
            <button class="cta" type="button">View details</button>
          </section>
          <div class="divider"></div>
          <section class="right">
            <div class="utility-icons" aria-hidden="true"><span>🌐</span><span>🔎</span></div>
            ${this._config.show_expected && expectedChip
              ? `<div class="expected-label">Expected delivery</div><div class="expected-chip">📅 ${this._escapeHtml(expectedChip)}</div>`
              : ""}
            <div class="latest">Latest update</div>
            <ul class="timeline">${eventsHtml}</ul>
            ${allEventsHtml}
            <div class="map-deco"></div>
            <div class="package" aria-hidden="true">📦</div>
          </section>
        </div>
      </div>
    `;

    this._bindActions();
  }

  _bindActions() {
    if (!this._card || this._config.action !== "more-info") {
      return;
    }

    const fire = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
    };

    const cta = this._card.querySelector(".cta");
    if (cta) {
      cta.addEventListener("click", fire);
    }

    this._card.style.cursor = "pointer";
    this._card.onclick = fire;
    this._card.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        fire(event);
      }
    };
    this._card.tabIndex = 0;
  }

  _carrierLabel(attrs) {
    if (typeof attrs.carrier_code === "string" && attrs.carrier_code.trim()) {
      return attrs.carrier_code.toUpperCase();
    }
    return "PAR";
  }

  _buildTitle(stateObj, attrs) {
    if (this._config.title) {
      return this._config.title;
    }

    const base =
      attrs.description ||
      attrs.tracking_number ||
      stateObj.attributes.friendly_name ||
      stateObj.entity_id;

    if (!this._config.show_carrier || typeof attrs.carrier_code !== "string") {
      return base;
    }

    return `${base}`;
  }

  _buildSubtitle(attrs) {
    const carrier = this._carrierLabel(attrs);
    const tracking = attrs.tracking_number ? String(attrs.tracking_number) : "";
    if (!tracking) {
      return `${carrier}`;
    }
    return `${carrier} / ${tracking}`;
  }

  _buildExpectedChip(attrs) {
    const start = attrs.timestamp_expected ?? attrs.date_expected;
    const end = attrs.timestamp_expected_end ?? attrs.date_expected_end;
    if (!start && !end) {
      return "No estimate";
    }

    const startDt = this._toDate(start);
    const endDt = this._toDate(end);
    const dateBase = startDt || endDt;
    if (!dateBase) {
      return `${String(start || "")} ${end ? `- ${String(end)}` : ""}`.trim();
    }

    const locale = this._hass?.locale?.language;
    const datePart = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dateBase);

    const formatTime = (d) =>
      d
        ? new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d)
        : "--:--";

    if (startDt || endDt) {
      return `${datePart} • ${formatTime(startDt)} - ${formatTime(endDt)}`;
    }

    return `${datePart}`;
  }

  _buildRoute(events, attrs) {
    const locations = events
      .map((event) => (event && event.location ? String(event.location).trim() : ""))
      .filter((location) => location.length > 0);

    if (locations.length > 1) {
      const from = locations[locations.length - 1];
      const to = locations[0];
      return `From ${from} → ${to}`;
    }

    if (locations.length === 1) {
      return `Location ${locations[0]}`;
    }

    if (attrs.latest_event_location) {
      return `Location ${attrs.latest_event_location}`;
    }

    return "";
  }

  _renderProgressRail(stageData) {
    return `
      <div class="progress">
        ${stageData.stages
          .map((stage, idx) => {
            const state = idx < stageData.current ? "done" : idx === stageData.current ? "active" : "";
            return `
              <div class="stage ${state}">
                <span class="stage-dot" aria-hidden="true">${stage.icon}</span>
                <span>${this._escapeHtml(stage.label)}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  _mapStatusToStage(statusCode) {
    const stages = [
      { label: "Shipped", icon: "📦" },
      { label: "Export", icon: "🌍" },
      { label: "In transit", icon: "🚚" },
      { label: "Expected", icon: "🗓️" },
      { label: "Delivered", icon: "✅" },
    ];

    const code = Number(statusCode);
    let current = 1;
    if (code === 8 || code === 1) {
      current = 0;
    } else if (code === 2 || code === 5) {
      current = 2;
    } else if (code === 4) {
      current = 3;
    } else if (code === 0) {
      current = 4;
    } else if (code === 6 || code === 7 || code === 3) {
      current = 2;
    }

    return { stages, current };
  }

  _renderEvent(event, isLatest) {
    const eventDate = this._formatDateTime(event?.date);
    const eventText = this._escapeHtml(event?.event || "No event");
    const location = event?.location ? ` — ${this._escapeHtml(event.location)}` : "";
    return `<li class="${isLatest ? "latest-item" : ""}">${this._escapeHtml(eventDate)} • ${eventText}${location}</li>`;
  }

  _toDate(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    let date;
    if (typeof value === "number" && Number.isFinite(value)) {
      date = new Date(value > 9999999999 ? value : value * 1000);
    } else {
      const text = String(value).trim();
      date = new Date(text);
      if (Number.isNaN(date.getTime()) && text.includes(" ")) {
        date = new Date(text.replace(" ", "T"));
      }
    }

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  _formatDateTime(value) {
    if (value === null || value === undefined || value === "") {
      return "Unknown time";
    }

    const date = this._toDate(value);
    if (!date) {
      return String(value);
    }

    const locale = this._hass?.locale?.language;
    return new Intl.DateTimeFormat(locale, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  _renderError(message) {
    return `<div class="error">${this._escapeHtml(message)}</div>`;
  }

  _escapeHtml(value) {
    return String(value)
      .split("&")
      .join("&amp;")
      .split("<")
      .join("&lt;")
      .split(">")
      .join("&gt;")
      .split('"')
      .join("&quot;")
      .split("'")
      .join("&#39;");
  }

  _toErrorText(err) {
    if (!err) {
      return "unknown error";
    }
    if (typeof err === "string") {
      return err;
    }
    if (err instanceof Error) {
      return err.message || err.name;
    }
    return String(err);
  }
}

if (!customElements.get("parcelapp-delivery-card")) {
  customElements.define("parcelapp-delivery-card", ParcelAppDeliveryCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "parcelapp-delivery-card")) {
  window.customCards.push({
    type: "parcelapp-delivery-card",
    name: "ParcelApp Delivery Card",
    description: "A high-fidelity shipment card for a single ParcelApp delivery.",
  });
}
