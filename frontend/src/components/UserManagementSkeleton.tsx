import React from "react";
import { Users, Search } from "lucide-react";
import "../styles/userManagement.css";
import "../styles/userManagementSkeleton.css";

const UserManagementSkeleton: React.FC = () => {
  return (
    <div className="user-management-container">
      <header className="user-management-header">
        <div className="header-title">
          <Users size={28} />
          <div className="skeleton-line skeleton-title"></div>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <div className="skeleton-line skeleton-search"></div>
          </div>
          <div className="skeleton-line skeleton-action-btn"></div>
        </div>
      </header>

      <div className="user-table-container">
        <table className="user-table is-loading">
          <thead>
            <tr>
              <th>
                <div className="skeleton-line skeleton-th-80"></div>
              </th>
              <th>
                <div className="skeleton-line skeleton-th-90"></div>
              </th>
              <th>
                <div className="skeleton-line skeleton-th-70"></div>
              </th>
              <th>
                <div className="skeleton-line skeleton-th-50"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td>
                  <div className="skeleton-line"></div>
                </td>
                <td>
                  <div className="skeleton-line"></div>
                </td>
                <td>
                  <div className="skeleton-line"></div>
                </td>
                <td>
                  <div className="skeleton-line"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementSkeleton;
