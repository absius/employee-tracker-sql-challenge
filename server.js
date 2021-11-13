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
            "View Employees By Department",
            "View Employees By Manager",
            "Add An Employee",
            "Remove An Employee",
            "Update Employee's Role",
            "View All Roles",
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
        if (choices === "Add New Dept") {
            addDept();
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

// function to verify whether user knows employee's ID

function removeEmployee(input) {
    const promptQ = {
        yes: 'Yes.',
        no: 'No. (View All Employees on Main Menu)'
    };
    inquirer.prompt([
        {
            name: "action",
            type: "list",
            message: `In order to process the employee, please enter the employee's ID.  Do you have the employee's ID? (View All Employees to get)`,
            choices: [promptQ.yes, promptQ.no]
        }
    ]).then(answer => {
        if (input === 'delete' && answer.action === "yes") deleteEmployee();
        else if (input === 'role' && answer.action === 'yes') updateRole();
        else viewAllEmployees();
    });
};

//function to delete an employee

const deleteEmployee = () => {
    let employees = `SELECT employee.id, employee.first_name, employee.last_name FROM employee`;
    connection.query(employees, (err, res) => {
        if (err) throw err;
        let employeeArray = [];
        response.forEach((employee) => {employeeArray.push(`${employee.first_name} ${employee.last_name}`);});

        inquirer.prompt([
            {
                name: 'deletedEmployee',
                type: 'list',
                message: 'Which employee would you like to remove?',
                choices: employeeArray
            }
        ]).then((answer) => {
            let employeeId;
            response.forEach((employee) => {
                if (
                    answer.deletedEmployee === `${employee.first_name} ${employee.last_name}`
                ) {
                    employeeId = employee.id;
                }
            });
            let deleteSql = `DELETE FROM employee WHERE employee.id = ?`;
            connection.query(deleteSql, (err) => {
                if (err) throw err;
                console.log("Employee has been successfully removed");
                viewAllEmployees();
            });
        });
    });
};

// function to update Employee's role

const updateRole = () => {
        connection.query(`SELECT employee.id, employee.first_name, employee.last_name, role.id AS "role_id"
        FROM employee, role, department WHERE department.id = role.department_id AND role.id = employee.role_id`, (err, res) => {
        if (err) throw err;
        let employeeNames = [];
        response.forEach((employee) => {employeeNames.push(`${employee.first_name} ${employee.last_name}`);});
        let roleSql = `SELECT role.id, role.title FROM role`;
        connection.query(roleSql, (err, res) => {
            if (err) throw err;
            let roleArray = [];
            response.forEach((role) => {roleArray.push(role.title);});
            inquirer.prompt([
                {
                    name: 'transferEmployee',
                    type: 'list',
                    message: "Select the employee who is transferring to a new role",
                    choice: employeeNames
                },
                {
                    name: 'newRole',
                    type: 'list',
                    message: "Select the employee's new role",
                    choices: roleArray
                }
            ]).then((answer) => {
                let newTitle, employeeId;

                response.forEach((role) => {
                    if (answer.newRole === role.title) {
                        newTitle = role.id;
                    }
                });
                response.forEach((employee) => {
                    if (answer.transferEmployee === `${employee.first_name} ${employee.last_name}`) {
                        employeeId = employee.id;
                    }
                });
                let updateSql = `UPDATE employee SET employee.role_id = ? WHERE employee.id = ?`;
                connection.query(updateSql, [newTitle, employeeId], (err) => {
                    if (err) throw err;
                    console.log("Success! Employee's role has been updated!");
                    promptUser();
                });
            });
        });
    });
}

// function to add a new department and role
const addRole = () => {
    const deptSql = 'SELECT * FROM department'
    connection.query(deptSql, (err, res) => {
        if (err) throw err;
        let deptArray = [];
        response.forEach((department) => {deptArray.push(department.department_name);});
        deptArray.push('New Department');
        inquirer.prompt([
            {
                name: 'deptName',
                type: 'list',
                message: 'Which department will the new role be in?',
                choices: deptArray
            }
        ]).then((answer) => {
            if (answer.deptName === 'New Department') {
                this.addDept();
            } else {
                addNewRole(answer);
            }
        });
        const addNewRole = (departmentData) => {
            inquirer.prompt ([
                {
                    name: 'newRole',
                    type: 'input',
                    message: "What is the new role you wish to add?"
                },
                {
                    name: 'salary',
                    type: 'input',
                    message: "What will be the new role's salary?"
                }
            ]).then((answer) => {
                let createRole = answer.newRole;
                let departmentId;
                response.forEach((department) => {
                    if (departmentData.departmentName === department.department_name) {departmentId = department.id;}
                });
                let newRoleSql = `INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)`;
                let crit = [createRole, answer.salary, departmentId];

                connection.query(newRoleSql, crit, (err) => {
                    if (err) throw err;
                    console.log("The new role has been succesfully added!");
                    viewAllRoles();
                });
            });
        };
    });
}

const addDept = () => {
    inquirer.prompt([
        {
            name: 'newDept',
            type: 'input',
            message: 'What is the name of the new department?'
        }
    ]).then((answer) => {
        let newDeptSql = `INSERT INTO department (department_name) VALUES (?)`;
        connection.query(newDeptSql, answer.newDept, (err, res) => {
            if (err) throw err;
            console.log(answer.newDept + "New department has been successfully created!");
        });
    });
};