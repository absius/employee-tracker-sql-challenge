//requiring dependencies
'use strict';

const mysql = require('mysql2');
const inquirer = require('inquirer');
const consoleTable = require('console.table');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'dallascorbin1',
    database: 'employee_tracker'
});

connection.connect(err => {
    if (err) throw err;
    promptUser();
});

const promptUser = () => {
    inquirer.prompt([
        {
        name: 'choices',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            "View All Employees",
            "View All Employees By Department",
            "View All Employees By Manager",
            "View All Employees By Role",
            "Add An Employee",
            "Remove An Employee",
            "Update An Employee's Role",
            "Add New Role",
            "Add New Department",
            "Exit"
        ]
    }
]).then((answers) => {
        const {choices} = answers;

        if (choices === 'View All Employees') {
            viewAllEmployees();
        }
        if (choices === 'View All Employees By Department') {
            viewByDepartment();
        }
        if (choices === 'View All Employees By Manager') {
            viewByManager();
        }
        if (choices === 'View All Employees By Role') {
            viewAllRoles();
        }
        if (choices === 'Add An Employee') {
            addEmployee();
        }
        if (choices === 'Remove An Employee') {
            removeEmployee();
        }
        if (choices === "Update An Employee's Role") {
            updateRole();
        }
        if (choices === "Add New Role") {
            addRole();
        }
        if (choices === "Add New Department") {
            addDepartment();
        }
        if (choices === "Exit") {
            connection.end;
        }
    });
}

// functions to view, filter, and sort employees

const viewAllEmployees = () => {
    const query = `SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, '', manager.last_name) AS manager
    FROM employee
    LEFT JOIN employee manager ON (manager.id = employee.manager_id)
    INNER JOIN role ON (role.id = employee.role_id)
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY employee.id;`;
    connection.query(query, (err, res) => {
        if (err) throw err;
        console.log('View All Employees');
        console.table(res);
        promptUser();
    });
}

const viewByDepartment = () => {
    const query = `SELECT department.name AS department, role.title, employee.id, employee.first_name, employee.last_name
    FROM employee
    LEFT JOIN role ON (role.id = employee.role_id)
    LEFT JOIN department ON (department.id = role.department_id)
    ORDER BY department.name;`;
    connection.query(query, (err, res) => {
        if(err) throw err;
        console.log('View Employees By Department');
        console.table(res);
        promptUser();
    });
}

const viewByManager = () => {
    const query = `SELECT CONCAT(manager.first_name, '', manager.last_name) AS manager, department.name AS department, employee.id, employee.first_name, employee.last_name, role.title
    FROM employee
    LEFT JOIN employee manager ON (manager.id = employee.manager_id)
    INNER JOIN role ON (role.id = employee.role_id && employee.manager_id !='NULL')
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY manager;`;
    connection.query(query, (err, res) => {
        if(err) throw err;
        console.log('View Employees By Manager');
        console.table(res);
        promptUser();
    });
}

const viewAllRoles = () => {
    const query = `SELECT role.title, employee.id, employee.first_name, employee.last_name, department.name AS department
    FROM employee
    LEFT JOIN role ON (role.id = employee.role_id)
    LEFT JOIN department ON (department.id = role.department_id)
    ORDER BY role.title;`;
    connection.query(query, (err, res) => {
        if(err) throw err;
        console.log('View Employees By Role');
        console.table(res);
        promptUser();
    });
}

// add functions to add, remove, and edit employees

const addEmployee = () => {
    inquirer.prompt([
        {
            type: 'input',
            name: 'firstName',
            message: "What is the new employee's first name?",
            validate: addFirstName => {
                if (addFirstName) {
                    return true;
                } else {
                    console.log("Please enter the new employee's first name.");
                    return false;
                }
            }
        },
        {
            type: 'input',
            name: 'lastName',
            message: "What is the new employee's last name?",
            validate: addLastName => {
                if (addLastName) {
                    return true;
                } else {
                    console.log("Please enter the new employee's last name.");
                    return false;
                }
            }
        }
    ]).then(answer => {
        const crit = [answer.firstName, answer.lastName]
        const newRole = `SELECT role.id, role.title FROM role`;
        connection.query(newRole, (err, data) => {
            if (err) throw err;
            const roles = data.map(({ id, title }) => ({ name: title, value: id }));
            inquirer.prompt([
                {
                    type: 'list',
                    name: 'role',
                    message: "What is the new employee's role",
                    choices: roles
                }
            ]).then(roleChoice => {
                const role = roleChoice.role;
                crit.push(role);
                const newManager = `SELECT * FROM employee`;
                connection.query(newManager, (err, data) => {
                    if (err) throw err;
                    const managers = data.map(({ id, first_name, last_name }) => ({ name: first_name + " " + last_name, value: id }));
                    inquirer.prompt([
                        {
                            type: 'list',
                            name: 'manager',
                            message: "Who is the new employee's manager?",
                            choices: managers
                        }
                    ]).then(managerChoice => {
                        const manager = managerChoice.manager;
                        crit.push(manager);
                        const newEmployee = `INSERT INTO employee (first_name, last_name, role_id, manager_id)
                                VALUES (?, ?, ?, ?)`;
                        connection.query(newEmployee, crit, (err) => {
                            if (err) throw err;
                            console.log("Success! New employee has been added!")
                            viewAllEmployees();
                        });
                    });
                });
            });
        });
    });
};


const addRole = async () => {
    const createRole = await inquirer
    .prompt([
    {
        type: 'number',
        name: 'newRoleId',
        message: 'What is the id of the new role?'
    },
    {
        type: 'input',
        name: 'newRoleTitle',
        message: 'What is the title of this role?'
    },
    {
        type: 'number',
        name: 'newRoleSalary',
        message: 'What is the salary for this role?'
    },
    {
        type: 'number',
        name: 'newRoleDeptId',
        message: 'What is the department id for this role?'
    },
]);
    connection.query(`INSERT INTO role (id, title, salary, department_id)
    VALUES (?, ?, ?, ?)`, 
    [
    createRole.newRoleId,
    createRole.newRoleTitle, 
    createRole.newRoleSalary, 
    createRole.newRoleDeptId
    ], 
    (err, res) => {
        if (err) {
            console.log(err);
        };
        console.table(res);
        promptUser();
    }

    )
};

const addDepartment = async () => {
    const createDepartment = await inquirer
    .prompt([
    {
        type: 'number',
        name: 'newDeptId',
        message: 'What is the id of the new department?'
    },
    {
        type: 'input',
        name: 'newDeptName',
        message: 'What is the name of the new department?'
    }
]);
connection.query(`INSERT INTO department (id, name)
    VALUES (?, ?)`, 
    [
    createDepartment.newDeptId,
    createDepartment.newDeptName
    ], 
    (err, res) => {
        if (err) {
            console.log(err);
        };
        console.table(res);
        promptUser();
    }

    )
};

// Delete an employee from the database
const removeEmployee = async () => {
    const deleteEmp = await inquirer
    .prompt({
        type: 'number',
        name: 'deleteEmpId',
        message: 'What is the id of the employee you wish to delete?'
    });
    connection.query(`DELETE FROM employee WHERE id = ?`, 
        deleteEmp.deleteEmpId,
        (err, res) => {
            if (err) {
                console.log(err);
            }
            console.table(res);
            promptUser();
        });
    };    

const updateRole = async () => {
    const roleUpdate = await inquirer
    .prompt([
        {
        type: 'number',
        name: 'empId',
        message: 'What is the id of the employee you wish to update?'
        },
        {
        type: 'number',
        name: 'roleId',
        message: 'What is the new role id for this employee?'
        }
    ]);
    connection.query(`UPDATE employee
    SET role_id = ?
    Where id = ?`, [roleUpdate.roleId, roleUpdate.empId],
    (err, res) => {
        if (err) {
            console.log(err);
        }
        console.table(res);
        promptUser();
    });
};
