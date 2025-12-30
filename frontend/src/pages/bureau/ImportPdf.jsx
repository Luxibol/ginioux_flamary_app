import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import OrderModal from "../../components/orders/OrderModal.jsx";
import { previewImport, confirmImport, cancelImport } from "../../services/imports.api.js";

export default function ImportPdf() {
  const inputRef = useRef(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [importId, setImportId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dedupe, setDedupe] = useState(null);

  const [messages, setMessages] = useState([]); // success | warning | error

  const openPicker = () => {
  if (!inputRef.current) return;
  inputRef.current.value = ""; // ✅ reset AVANT
  inputRef.current.click();
  };


  const pushMessage = (type, text) => {
    setMessages((prev) => [{ type, text }, ...prev].slice(0, 6));
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);

      // 1) preview (aucune écriture BDD)
      const res = await previewImport(file);
      setImportId(res.importId);
      setPreview(res.preview);
      setDedupe(res.dedupe);

      // si déjà existante => pas de modale (pour l’instant)
      if (res.dedupe?.match) {
        pushMessage("warning", `Commande ${res.preview.arc} déjà présente — aucune création possible depuis l’import.`);
        // on nettoie le preview en RAM car on ne va pas l'utiliser
        await cancelImport(res.importId);
        setImportId(null);
        setPreview(null);
        setDedupe(null);
        return;
      }


      // 2) ouverture auto modale pour validation visuelle
      setModalOpen(true);
    } catch (e) {
      const missing = e?.data?.missingLabels;
      if (Array.isArray(missing) && missing.length > 0) {
        pushMessage(
      "error",
      `${e.message}\nProduits manquants :\n- ${missing.join("\n- ")}`
      );
      } else {
        pushMessage("error", e.message || "Import impossible.");
      }

    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = async (cancelOnServer = true) => {
  setModalOpen(false);

  // On annule côté serveur uniquement si l'utilisateur FERME sans valider
  if (cancelOnServer && importId) {
    await cancelImport(importId);
  }

  setImportId(null);
  setPreview(null);
  setDedupe(null);
};


  const confirm = async (payloadFromModal) => {
  try {
    setIsLoading(true);

    // payloadFromModal = { preview, internalComment } (si utilisation de la modale)
    const result = await confirmImport(importId, payloadFromModal ?? { preview });

    const { ok, status, data } = result;

    // 200 OK : création
    if (ok && data.action === "created") {
      pushMessage(
        "success",
        `Commande ${data.arc} créée à partir du PDF — ajoutée à “Commandes en cours”.`
      );
      await closeModal(false);
      return;
    }

    // 409 : déjà existante (skipped)
    if (status === 409 || data.action === "skipped") {
      pushMessage(
        "warning",
        `Commande ${data.arc} déjà présente — aucune création effectuée.`
      );
      await closeModal(false);
      return;
    }

    // 422 : produits introuvables / parsing incomplet
    if (status === 422) {
      const extra = data.missingLabels?.length
        ? ` Produits manquants : ${data.missingLabels.join(" | ")}`
        : "";
      pushMessage("error", (data.error || "Validation impossible.") + extra);
      return;
    }

    // Autres erreurs
    pushMessage("error", data.error || "Erreur lors de la validation.");
  } catch (e) {
    pushMessage("error", e.message || "Erreur lors de la validation.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div>
      <div className="mb-6">
        <h1 className="gf-h1">Import PDF</h1>
        <p className="gf-body mt-1">
          Importer un bon PDF ARC pour créer une commande.
        </p>
      </div>

      <div
        className={[
          "mx-auto w-full max-w-3xl rounded-2xl border border-gf-border bg-gf-surface",
          "flex flex-col items-center justify-center px-6 py-14 text-center",
          isDragOver ? "bg-gf-orange/10 border-gf-orange" : "",
        ].join(" ")}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Paperclip className="h-16 w-16 text-gf-orange" />
        <p className="gf-body mt-4">Glissez-déposez un fichier PDF ici</p>

        <p className="gf-body mt-4 text-gf-subtitle">
          ou cliquez sur le bouton ci-dessous pour le sélectionner.
        </p>

        <button
          type="button"
          onClick={openPicker}
          disabled={isLoading}
          className="mt-4 h-9 rounded-md bg-gf-orange px-4 text-white text-xs font-medium hover:opacity-90 disabled:opacity-60"
        >
          {isLoading ? "Traitement…" : "Choisir un fichier PDF"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-10 max-w-3xl mx-auto">
        <div className="text-sm font-medium text-gf-title">Résultats récents</div>
        <div className="gf-body text-gf-subtitle">
          Les commandes validées apparaissent automatiquement dans “Commandes en cours”.
        </div>

        <ul className="mt-3 space-y-2">
          {messages.length === 0 ? (
            <li className="gf-body text-gf-subtitle">Aucun import validé pour le moment.</li>
          ) : (
            messages.map((m, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span
                  className={[
                    "mt-1 h-2 w-2 rounded-full",
                    m.type === "success" ? "bg-gf-success" : "",
                    m.type === "warning" ? "bg-gf-orange" : "",
                    m.type === "error" ? "bg-gf-danger" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-xs whitespace-pre-line",
                    m.type === "success" ? "text-gf-success" : "",
                    m.type === "warning" ? "text-gf-orange" : "",
                    m.type === "error" ? "text-gf-danger" : "",
                  ].join(" ")}
                >
                  {m.text}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <OrderModal
  open={modalOpen}
  onClose={() => closeModal(true)}
  onConfirm={(payload) => confirm(payload)}
  context="import"
  data={preview}
  warning={dedupe?.message}
/>

    </div>
  );
}
