import React, { useEffect, useState } from 'react';
import { Employee, getEmployees, addEmployee, sampleEmployees } from '../lib/employeeUtils';

interface EmployeeManagementProps {
  isDarkMode?: boolean;
}

export default function EmployeeManagement({ isDarkMode = false }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const fetchedEmployees = await getEmployees();
      setEmployees(fetchedEmployees);
      setError(null);
    } catch (err) {
      setError('Failed to fetch employees');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddSampleEmployees = async () => {
    setIsLoading(true);
    try {
      for (const employee of sampleEmployees) {
        await addEmployee(employee);
      }
      await fetchEmployees();
      setError(null);
    } catch (err) {
      setError('Failed to add sample employees');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-5xl font-bold font-space mb-2 ${
            isDarkMode ? 'text-light' : 'text-dark'
          }`}>
            <span className="text-accent">Mitarbeiter</span> Verwaltung
          </h1>
          <p className={`text-xl font-inter ${
            isDarkMode ? 'text-light-200' : 'text-light-500'
          }`}>
            Übersicht aller registrierten Mitarbeiter
          </p>
          <div className="h-1 bg-gradient-to-r from-accent via-orange-400 to-orange-500 rounded-full mt-4"></div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {employees.length === 0 && !isLoading && (
          <div className="mb-6">
            <button
              onClick={handleAddSampleEmployees}
              className="btn-primary"
            >
              Sample Mitarbeiter hinzufügen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`glass-card p-6 transition-all duration-300 hover:scale-105 ${
                  isDarkMode
                    ? 'bg-dark-200/50 border-dark-300 hover:border-accent/50'
                    : 'bg-light/50 border-light-300 hover:border-accent/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <h3 className={`text-xl font-bold font-space ${
                      isDarkMode ? 'text-light' : 'text-dark'
                    }`}>
                      {employee.name}
                    </h3>
                    <p className="text-sm font-medium text-accent">
                      {employee.position}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Abteilung
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {employee.department}
                      </p>
                    </div>
                    
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        E-Mail
                      </p>
                      <p className={`text-sm break-all ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {employee.email}
                      </p>
                    </div>
                    
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Telefon
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {employee.phoneNumber}
                      </p>
                    </div>
                    
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Startdatum
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {new Date(employee.startDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      employee.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 