(() => {
  const claimId = new URLSearchParams(window.location.search).get("id") || "";
  const validClaimId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimId);

  document.querySelectorAll("[data-claim-id]").forEach((node) => {
    node.textContent = validClaimId ? claimId : "Keine gültige Check-ID übergeben";
  });
  document.querySelectorAll("[data-open-claim]").forEach((node) => {
    if (validClaimId) node.href = `rly://claim/${encodeURIComponent(claimId)}`;
    else { node.hidden = true; node.removeAttribute("href"); }
  });

  document.querySelectorAll("[data-open-auth]").forEach((node) => {
    node.href = "rly://auth/callback";
  });
})();
