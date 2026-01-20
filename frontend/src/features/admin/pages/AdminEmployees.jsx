/**
 * Admin — Employés
 * - Liste des comptes (activation / désactivation)
 * - Création, édition et reset mot de passe
 * - Table desktop + cards mobile
 */
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Pencil, KeyRound } from "lucide-react";

import { listUsers, createUser, patchUser, resetUserPassword } from "../../../services/adminUsers.api.js";
import { formatFullName } from "../utils/adminEmployees.utils.js";

import EmployeeCreateModal from "../components/EmployeeCreateModal.jsx";
import EmployeeEditModal from "../components/EmployeeEditModal.jsx";
import EmployeeResetPasswordModal from "../components/EmployeeResetPasswordModal.jsx";

/**
 * Page de gestion des employés (Admin).
 * @returns {import("react").JSX.Element}
 */
export default function AdminEmployees() {
  // Data
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fLogin, setFLogin] = useState("");
  const [fRole, setFRole] = useState("PRODUCTION");
  const [fActive, setFActive] = useState(true);
  const [createdTempPassword, setCreatedTempPassword] = useState("");

  // Edit modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eFirstName, setEFirstName] = useState("");
  const [eLastName, setELastName] = useState("");
  const [eLogin, setELogin] = useState("");
  const [eRole, setERole] = useState("PRODUCTION");
  const [eActive, setEActive] = useState(true);
  const [editError, setEditError] = useState("");

  // Reset password modal state
  const [openReset, setOpenReset] = useState(false);
  const [resetTitle, setResetTitle] = useState("");
  const [resetTempPassword, setResetTempPassword] = useState("");
  const [resetError, setResetError] = useState("");
  
  const [, setResetId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await listUsers();

      setRows(res.data || []);
      setCount(res.count || (res.data?.length ?? 0));
    } catch (e) {
      setError(e.message || "Erreur chargement employés.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  // Chargement initial
  useEffect(() => {
    load();
  }, []);

  function openEditModal(u) {
    setEditError("");
    setEditId(u.id);
    setEFirstName(String(u.first_name || ""));
    setELastName(String(u.last_name || ""));
    setELogin(String(u.login || ""));
    setERole(String(u.role || "PRODUCTION"));
    setEActive(Boolean(u.is_active));
    setOpenEdit(true);
  }

  async function onCreate() {
    try {
      setLoading(true);
      setError("");

      const first_name = fFirstName.trim();
      const last_name = fLastName.trim();
      const login = fLogin.trim();

      if (!last_name) throw new Error("Nom obligatoire.");
      if (!first_name) throw new Error("Prénom obligatoire.");

      const res = await createUser({
        first_name,
        last_name,
        login: login || undefined,
        role: fRole,
        is_active: fActive ? 1 : 0,
      });

      setCreatedTempPassword(res.temp_password || "");
      await load();
    } catch (e) {
      setError(e.message || "Erreur création employé.");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveEdit() {
    try {
      setLoading(true);
      setEditError("");

      const id = editId;
      if (!id) throw new Error("ID manquant.");

      const patch = {
        first_name: eFirstName.trim(),
        last_name: eLastName.trim(),
        login: eLogin.trim(),
        role: eRole,
        is_active: eActive ? 1 : 0,
      };

      if (!patch.last_name) throw new Error("Nom obligatoire.");
      if (!patch.first_name) throw new Error("Prénom obligatoire.");
      if (!patch.login) throw new Error("Identifiant obligatoire.");

      await patchUser(id, patch);

      setOpenEdit(false);
      setEditId(null);
      await load();
    } catch (e) {
      setEditError(e.message || "Erreur modification employé.");
    } finally {
      setLoading(false);
    }
  }

  async function onToggleActive(u) {
    try {
      setLoading(true);
      setError("");
      await patchUser(u.id, { is_active: u.is_active ? 0 : 1 });
      await load();
    } catch (e) {
      setError(e.message || "Erreur modification employé.");
    } finally {
      setLoading(false);
    }
  }

  async function onOpenReset(u) {
    setResetError("");
    setResetTempPassword("");
    setResetId(u.id);
    setResetTitle(`${formatFullName(u)} — ${u.login}`);
    setOpenReset(true);

    try {
      setLoading(true);
      const res = await resetUserPassword(u.id);
      setResetTempPassword(res.temp_password || "");
      await load();
    } catch (e) {
      setResetError(e.message || "Erreur réinitialisation mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="gf-h1">Gestion des employés</h1>
          <div className="gf-body text-gf-subtitle mt-1">
            {loading ? "Chargement…" : `${count} employé(s)`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setError("");
              setCreatedTempPassword("");
              setOpenCreate(true);
            }}
            className="gf-btn gf-btn-primary h-9 px-4 text-xs"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="gf-btn h-9 px-3 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Table/cards */}
      <div className="mt-6 gf-card overflow-hidden">
        {error ? <div className="p-4 gf-error">{error}</div> : null}

        {/* Header tableau */}
        <div className="hidden md:block bg-gf-bg text-gf-subtitle">
          <div className="p-3">
            <div
              className="grid items-center px-4 py-3 gap-3 font-medium text-xs justify-items-center"
              style={{ gridTemplateColumns: "minmax(260px,1fr) 180px 160px 140px 340px" }}
            >
              <div className="justify-self-start">Employé</div>
              <div>Identifiant</div>
              <div>Rôle</div>
              <div>Actif</div>
              <div>Actions</div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-gf-bg">
          {rows.length === 0 ? (
            <div className="p-4 text-xs text-gf-subtitle">
              {loading ? "Chargement…" : "Aucun employé."}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
                >
                  {/* DESKTOP */}
                  <div
                    className="hidden md:grid items-center px-4 py-3 gap-3 text-xs hover:bg-gf-orange/5"
                    style={{
                      gridTemplateColumns: "minmax(260px,1fr) 180px 160px 140px 340px",
                    }}
                  >
                    <div className="truncate text-gf-title font-medium">{formatFullName(u)}</div>
                    <div className="text-center font-mono">{u.login}</div>
                    <div className="text-center">{u.role}</div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        className={[
                          "h-7 px-3 rounded-md text-[11px] font-medium",
                          u.is_active ? "bg-gf-success text-white" : "bg-gf-border/50 text-gf-title",
                        ].join(" ")}
                        disabled={loading}
                        title="Activer / désactiver"
                      >
                        {u.is_active ? "Actif" : "Inactif"}
                      </button>
                    </div>

                    <div className="text-center flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenReset(u)}
                        className="gf-btn gf-btn-primary h-8 px-3 text-xs"
                        disabled={loading || !u.is_active}
                        title="Réinitialiser le mot de passe"
                      >
                        <KeyRound className="h-4 w-4" />
                        MDP
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="gf-btn h-8 px-3 text-xs"
                        disabled={loading}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </button>
                    </div>
                  </div>

                  {/* MOBILE */}
                  <div className="md:hidden px-4 py-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-gf-title font-medium truncate">{formatFullName(u)}</div>
                        <div className="mt-1 text-[11px] text-gf-subtitle font-mono">{u.login}</div>
                        <div className="mt-1 text-[11px] text-gf-subtitle">{u.role}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleActive(u)}
                        className={[
                          "h-7 px-3 rounded-md text-[11px] font-medium shrink-0",
                          u.is_active ? "bg-gf-success text-white" : "bg-gf-border/50 text-gf-title",
                        ].join(" ")}
                        disabled={loading}
                        title="Activer / désactiver"
                      >
                        {u.is_active ? "Actif" : "Inactif"}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenReset(u)}
                        className="gf-btn gf-btn-primary h-8 flex-1 text-xs"
                        disabled={loading || !u.is_active}
                        title="Réinitialiser le mot de passe"
                      >
                        MDP
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="gf-btn h-8 flex-1 text-xs"
                        disabled={loading}
                        title="Modifier"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <EmployeeCreateModal
        open={openCreate}
        loading={loading}
        error={error}
        fFirstName={fFirstName}
        setFFirstName={setFFirstName}
        fLastName={fLastName}
        setFLastName={setFLastName}
        fLogin={fLogin}
        setFLogin={setFLogin}
        fRole={fRole}
        setFRole={setFRole}
        fActive={fActive}
        setFActive={setFActive}
        createdTempPassword={createdTempPassword}
        onClearTempPassword={() => {
          // Réinitialise le formulaire
          setCreatedTempPassword("");
          setFFirstName("");
          setFLastName("");
          setFLogin("");
          setFRole("PRODUCTION");
          setFActive(true);
        }}
        onClose={() => setOpenCreate(false)}
        onSubmit={onCreate}
      />

      <EmployeeEditModal
        open={openEdit}
        loading={loading}
        error={editError}
        eFirstName={eFirstName}
        setEFirstName={setEFirstName}
        eLastName={eLastName}
        setELastName={setELastName}
        eLogin={eLogin}
        setELogin={setELogin}
        eRole={eRole}
        setERole={setERole}
        eActive={eActive}
        setEActive={setEActive}
        onClose={() => {
          setOpenEdit(false);
          setEditId(null);
        }}
        onSubmit={onSaveEdit}
      />

      <EmployeeResetPasswordModal
        open={openReset}
        loading={loading}
        error={resetError}
        titleLine={resetTitle}
        tempPassword={resetTempPassword}
        onClose={() => {
          setOpenReset(false);
          setResetId(null);
          setResetTitle("");
          setResetTempPassword("");
          setResetError("");
        }}
      />
    </div>
  );
}
