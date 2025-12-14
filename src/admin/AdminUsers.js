import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './admin.css';

export default function AdminUsers() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'editor',
    countries: [],
    permissions: {
      canCreate: true,
      canEdit: false,
      canDelete: false,
      requiresApproval: true
    }
  });

  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/admin');
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRes, countriesRes] = await Promise.all([
        fetch('/api/auth/users', { headers: getAuthHeaders() }),
        fetch('/api/cms/countries?lang=es', { headers: getAuthHeaders() })
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (countriesRes.ok) {
        const data = await countriesRes.json();
        setCountries(data.countries);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'editor',
      countries: [],
      permissions: {
        canCreate: true,
        canEdit: false,
        canDelete: false,
        requiresApproval: true
      }
    });
    setShowModal(true);
  }

  function openEditModal(u) {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '',
      name: u.name,
      role: u.role,
      countries: u.countries || [],
      permissions: u.permissions || {
        canCreate: true,
        canEdit: false,
        canDelete: false,
        requiresApproval: true
      }
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const url = editingUser 
      ? `/api/auth/users/${editingUser.id}`
      : '/api/auth/users';
    
    const method = editingUser ? 'PUT' : 'POST';
    
    const body = { ...formData };
    if (editingUser && !body.password) {
      delete body.password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`¿Eliminar al usuario "${u.name}"?`)) return;

    try {
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  function toggleCountry(code) {
    const current = formData.countries || [];
    if (current.includes(code)) {
      setFormData({ ...formData, countries: current.filter(c => c !== code) });
    } else {
      setFormData({ ...formData, countries: [...current, code] });
    }
  }

  function toggleAllCountries() {
    if (formData.countries.includes('all')) {
      setFormData({ ...formData, countries: [] });
    } else {
      setFormData({ ...formData, countries: ['all'] });
    }
  }

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <Link to="/admin" className="admin-back-link">← Volver</Link>
          <h1>Gestión de Usuarios</h1>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Usuarios ({users.length})</h2>
            <button onClick={openCreateModal} className="admin-btn-primary">
              + Nuevo Usuario
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Países</th>
                  <th>Permisos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role === 'admin' ? 'Admin' : 'Editor'}
                      </span>
                    </td>
                    <td>
                      {u.countries?.includes('all') 
                        ? 'Todos' 
                        : u.countries?.length || 0}
                    </td>
                    <td>
                      <div className="admin-permissions-badges">
                        {u.permissions?.canCreate && <span className="perm-badge create">Crear</span>}
                        {u.permissions?.canEdit && <span className="perm-badge edit">Editar</span>}
                        {u.permissions?.canDelete && <span className="perm-badge delete">Eliminar</span>}
                        {u.permissions?.requiresApproval && <span className="perm-badge approval">Requiere Aprobación</span>}
                      </div>
                    </td>
                    <td>
                      <button onClick={() => openEditModal(u)} className="admin-btn-icon" title="Editar">
                        ✏️
                      </button>
                      {u.username !== 'admin' && (
                        <button onClick={() => handleDelete(u)} className="admin-btn-icon delete" title="Eliminar">
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal large">
            <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={editingUser}
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>{editingUser ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Países con Acceso</label>
                <div className="admin-countries-checkboxes">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.countries.includes('all')}
                      onChange={toggleAllCountries}
                    />
                    <span>Todos los países</span>
                  </label>
                  {!formData.countries.includes('all') && countries.map(c => (
                    <label key={c.code} className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.countries.includes(c.code)}
                        onChange={() => toggleCountry(c.code)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-form-group">
                <label>Permisos</label>
                <div className="admin-permissions-checkboxes">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canCreate}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canCreate: e.target.checked }
                      })}
                    />
                    <span>Puede crear contenido</span>
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canEdit}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canEdit: e.target.checked }
                      })}
                    />
                    <span>Puede editar contenido</span>
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canDelete}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canDelete: e.target.checked }
                      })}
                    />
                    <span>Puede eliminar contenido</span>
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.permissions.requiresApproval}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, requiresApproval: e.target.checked }
                      })}
                    />
                    <span>Sus cambios requieren aprobación</span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
