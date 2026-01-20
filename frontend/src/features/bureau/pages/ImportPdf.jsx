/**
 * Page "Import PDF" :
 * - upload d'un PDF (drag & drop ou sélecteur)
 * - appel /pdf/preview pour obtenir une prévisualisation
 * - ouverture de la modale pour permettre l'édition complète
 * - confirmation via /pdf/:importId/confirm
 * - annulation via DELETE /pdf/:importId si l'utilisateur ferme la modale
 */
import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import OrderModal from "../components/OrderModal.jsx";
import {
  previewImport,
  confirmImport,
  cancelImport,
} from "../../../services/imports.api.js";
import { pushMessage as pushMessageUtil } from "../utils/importPdf.messages.js";
import { buildImportErrorMessage } from "../mappers/importPdf.mappers.js";

/**
 * ImportPdf (page).
 * - Upload PDF + preview + édition via modale
 * - Confirmation / annulation (cleanup serveur)
 * @returns {import("react").JSX.Element}
 */
export default function ImportPdf() {
  const inputRef = useRef(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [importId, setImportId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dedupe, setDedupe] = useState(null);

  const [messages, setMessages] = useState([]); // success | warning | error

  /**
   * Ouvre le sélecteur de fichier.
   * Réinitialise la valeur pour permettre de re-sélectionner le même PDF.
   * @returns {void}
   */
  const openPicker = () => {
    if (!inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  };

  /**
   * Ajoute un message (success|warning|error) en tête de liste, avec une limite.
   * @param {"success"|"warning"|"error"} type
   * @param {string} text
   * @returns {void}
   */
  const pushMessage = (type, text) => {
    setMessages((prev) => pushMessageUtil(prev, type, text));
  };

  /**
   * Traite un fichier PDF :
   * - appelle l'endpoint preview
   * - stocke importId + preview + dedupe
   * - bloque si la commande existe déjà (dédoublonnage ARC)
   * - ouvre la modale si tout est OK
   * @param {FileList|File[]} files
   * @returns {Promise<void>}
   */
  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);

      const res = await previewImport(file);
      setImportId(res.importId);
      setPreview(res.preview);
      setDedupe(res.dedupe);

      if (res.dedupe?.match) {
        pushMessage(
          "warning",
          `Commande ${res.preview.arc} déjà présente — aucune création possible depuis l’import.`,
        );
        // Si l'ARC existe déjà : on affiche un warning et on annule la preview côté serveur (cleanup du store).
        await cancelImport(res.importId);
        setImportId(null);
        setPreview(null);
        setDedupe(null);
        return;
      }

      setModalOpen(true);
    } catch (e) {
      pushMessage("error", buildImportErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ferme la modale et nettoie l'état local.
   * Par défaut, annule aussi la preview côté serveur (DELETE /pdf/:importId).
   * @param {boolean} [cancelOnServer=true]
   * @returns {Promise<void>}
   */
  const closeModal = async (cancelOnServer = true) => {
    setModalOpen(false);

    if (cancelOnServer && importId) {
      await cancelImport(importId);
    }

    setImportId(null);
    setPreview(null);
    setDedupe(null);
  };

  /**
   * Confirme l'import :
   * - envoie les données (modifiées ou non) à /pdf/:importId/confirm
   * - gère les retours (created / skipped / erreurs)
   * - ferme la modale et purge la preview si nécessaire
   * @param {unknown} payloadFromModal
   * @returns {Promise<void>}
   */
  const confirm = async (payloadFromModal) => {
    try {
      setIsLoading(true);
      // Le payload provient de la modale (édition utilisateur). Fallback sur { preview } si besoin.
      const result = await confirmImport(
        importId,
        payloadFromModal ?? { preview },
      );
      const { ok, status, data } = result;

      if (ok && data.action === "created") {
        pushMessage(
          "success",
          `Commande ${data.arc} créée à partir du PDF — ajoutée à “Commandes en cours”.`,
        );
        await closeModal(false);
        return;
      }

      if (status === 409 || data.action === "skipped") {
        pushMessage(
          "warning",
          `Commande ${data.arc} déjà présente — aucune création effectuée.`,
        );
        await closeModal(false);
        return;
      }

      if (status === 422) {
        const extra = data.missingLabels?.length
          ? ` Produits manquants : ${data.missingLabels.join(" | ")}`
          : "";
        pushMessage("error", (data.error || "Validation impossible.") + extra);
        return;
      }

      pushMessage("error", data.error || "Erreur lors de la validation.");
    } catch (e) {
      pushMessage("error", buildImportErrorMessage(e));
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
          "mx-auto w-full max-w-3xl gf-card",
          "flex flex-col items-center justify-center px-6 py-14 text-center",
          isDragOver ? "bg-gf-orange/10 border-gf-orange" : "",
        ].join(" ")}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
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
          className="mt-4 gf-btn gf-btn-primary"
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
        <div className="gf-h3">
          Résultats récents
        </div>
        <div className="gf-body text-gf-subtitle">
          Les commandes validées apparaissent automatiquement dans “Commandes en
          cours”.
        </div>

        <ul className="mt-3 space-y-2">
          {messages.length === 0 ? (
            <li className="gf-empty">
              Aucun import validé pour le moment.
            </li>
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
      // Force le remount de la modale entre deux imports (réinitialise son state interne).
        key={`${preview?.arc ?? "new"}-${modalOpen}`}
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
