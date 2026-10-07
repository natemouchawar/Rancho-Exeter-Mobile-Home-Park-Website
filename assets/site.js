const menuButton = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-nav]");
function closeMenu() {
  if (!menuButton || !mobileMenu) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}
menuButton?.addEventListener("click", () => {
  const opening = mobileMenu.hidden;
  mobileMenu.hidden = !opening;
  menuButton.setAttribute("aria-expanded", String(opening));
  menuButton.setAttribute(
    "aria-label",
    opening ? "Close navigation" : "Open navigation",
  );
});
mobileMenu
  ?.querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileMenu && !mobileMenu.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
matchMedia("(min-width: 1001px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const lightbox = document.querySelector("#photo-lightbox");
const photos = [...document.querySelectorAll("[data-gallery-src]")];
let photoIndex = 0;
let photoTrigger;
function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const photo = photos[photoIndex];
  lightbox.querySelector("img").src = photo.dataset.gallerySrc;
  lightbox.querySelector("img").alt = photo.dataset.galleryAlt;
  lightbox.querySelector("[data-photo-caption]").textContent =
    `${photoIndex + 1} / ${photos.length} — ${photo.dataset.galleryAlt}`;
}
photos.forEach((photo, index) =>
  photo.addEventListener("click", () => {
    photoTrigger = photo;
    showPhoto(index);
    lightbox.showModal();
  }),
);
lightbox
  ?.querySelector("[data-close]")
  ?.addEventListener("click", () => lightbox.close());
lightbox
  ?.querySelector("[data-prev]")
  ?.addEventListener("click", () => showPhoto(photoIndex - 1));
lightbox
  ?.querySelector("[data-next]")
  ?.addEventListener("click", () => showPhoto(photoIndex + 1));
lightbox?.addEventListener("close", () => photoTrigger?.focus());
lightbox?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(photoIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(photoIndex + 1);
  }
});

const form = document.querySelector("#inquiry-form");
if (form) {
  const subjects = {
    "available-home": "Space 97",
    "available-lot": "an available space",
    general: "Rancho Exeter",
  };
  const interest = new URLSearchParams(location.search).get("interest");
  const selectedInterest = Object.hasOwn(subjects, interest)
    ? interest
    : "general";
  form.elements.interest.value = selectedInterest;
  const result = document.querySelector("#inquiry-result");
  const error = document.querySelector("#inquiry-error");
  const availability = document.querySelector("#inquiry-availability");
  const submit = form.querySelector("[type=submit]");
  const submitLabel = document.querySelector("#submit-label");
  let ready = false;
  let sending = false;
  let requestId = crypto.randomUUID();

  fetch("/api/inquiry", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { ready: false }))
    .then((status) => {
      ready = status.ready === true;
      submit.disabled = !ready;
      availability.hidden = ready;
    })
    .catch(() => {
      /* Phone and email remain available if the service is offline. */
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ready || sending) return;
    error.hidden = true;
    result.hidden = true;
    if (!form.reportValidity()) return;
    const phone = form.elements.phone.value.replace(/\D/g, "");
    let invalidField;
    if (!form.elements.fullName.value.trim()) {
      error.textContent = "Please enter your name.";
      invalidField = form.elements.fullName;
    } else if (!/^(?:1)?\d{10}$/.test(phone)) {
      error.textContent =
        "Please enter your phone number, including the area code.";
      invalidField = form.elements.phone;
    }
    if (invalidField) {
      error.hidden = false;
      invalidField.focus();
      return;
    }
    sending = true;
    submit.disabled = true;
    submitLabel.textContent = "Sending…";
    const payload = Object.fromEntries(new FormData(form));
    payload.requestId = requestId;
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true)
        throw new Error(
          data.error ||
            "We couldn’t send your inquiry. Please call the office.",
        );
      document.querySelector("#result-summary").textContent =
        `Your inquiry about ${subjects[payload.interest]} has been sent to the office. We’ll be in touch using the contact details you provided.`;
      form.reset();
      form.elements.interest.value = selectedInterest;
      requestId = crypto.randomUUID();
      form.hidden = true;
      result.hidden = false;
      result.focus();
    } catch (failure) {
      error.textContent =
        failure.name === "TimeoutError" || failure instanceof TypeError
          ? "We couldn’t confirm your inquiry was sent. Please try again, or call (949) 463-1167."
          : failure.message;
      error.hidden = false;
    } finally {
      sending = false;
      submit.disabled = !ready;
      submitLabel.textContent = "Send Inquiry";
    }
  });
  document.querySelector("#edit-inquiry").addEventListener("click", () => {
    result.hidden = true;
    form.hidden = false;
    form.elements.fullName.focus();
  });
}
