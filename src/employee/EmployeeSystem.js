'use strict';

const config = require('../data/employeeSystemConfig.js');

class EmployeeSystem {
  createEmployee(name, position) {
    const role = config.positions[position] || config.positions.newbie;
    return {
      id: 'employee_' + Date.now(),
      name: name || '新员工',
      position,
      level: role.level,
      skills: {
        cooking: 50,
        service: 50,
        efficiency: 50,
        stability: 50,
        innovation: 50
      },
      experience: 0
    };
  }

  addExperience(employee, value) {
    employee.experience += value;
    return employee;
  }
}

module.exports = new EmployeeSystem();
