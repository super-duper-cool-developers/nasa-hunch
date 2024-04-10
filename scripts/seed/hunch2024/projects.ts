import { faker } from '@faker-js/faker';
import { Chance } from 'chance';

import { makePassword } from '../../../src/lib/server/password';
import { pickAvatar } from './pickAvatar';
import { PrismaTransactionClient } from './returnType';
import { ProjectUser } from '@prisma/client';

const chance = new Chance();

export async function seed(prisma: PrismaTransactionClient) {
	console.log('Seeding projects...');

	// For every organization, create 5 projects
	const projectTemplateCount = await prisma.projectTemplate.count();
	const organizationCount = await prisma.organization.count();

	for (let i = 1; i <= organizationCount; i++) {
		for (let j = 0; j < 5; j++) {
			const project = await prisma.project.create({
				data: {
					submitted: Math.random() > 0.9,
					organization: {
						connect: {
							id: i
						}
					},
					projectTemplate: {
						connect: {
							id: Math.floor(Math.random() * projectTemplateCount) + 1
						}
					},
					joinCode: 123456 + i * 10 + j,
				}
			});

			// Add one or two teachers
			for (let k = 0; k < chance.weighted([1, 2], [0.9, 0.1]); k++) {
				await prisma.projectUser.create({
					data: {
						project: {
							connect: {
								id: project.id
							}
						},
						user: {
							create: {
								email: `${i}@project${j}.teacher${k}`,
								firstName: faker.person.firstName(),
								lastName: faker.person.lastName(),
								role: 'TEACHER',
								pfp: pickAvatar(),
								orgId: i,
								...(await makePassword('password' + process.env.PASSWORD_SUFFIX || ''))
							}
						},
						permission: 'EDITOR'
					}
				});
			}

			// Add three verified students
			for (let k = 0; k < 3; k++) {
				await prisma.projectUser.create({
					data: {
						project: {
							connect: {
								id: project.id
							}
						},
						user: {
							create: {
								email: `${i}@project${j}.student${k}`,
								firstName: faker.person.firstName(),
								lastName: faker.person.lastName(),
								role: 'STUDENT',
								orgId: i,
								...chance.weighted([{ pfp: pickAvatar() }, {}], [0.9, 0.1]),
								...(await makePassword('password' + process.env.PASSWORD_SUFFIX || ''))
							}
						},
						permission: 'EDITOR'
					}
				});
			}

			// Add one or two unapproved students
			let users: ProjectUser[] = [];
			for (let k = 0; k < chance.pickone([1, 2]); k++) {
				const user = await prisma.projectUser.create({
					data: {
						project: {
							connect: {
								id: project.id
							}
						},
						user: {
							create: {
								email: `${i}@project${j}.unapproved${k}`,
								firstName: faker.person.firstName(),
								lastName: faker.person.lastName(),
								role: 'STUDENT',
								pfp: pickAvatar(),
								orgId: i,
								...(await makePassword('password' + process.env.PASSWORD_SUFFIX || ''))
							}
						},
						permission: 'NEEDS_APPROVAL'
					}
				});
				users.push(user);
			}

			// Add zero to five tasks.
			for (let k = 0; k < chance.weighted([0, 1, 2, 3, 4, 5], [1, 9, 9, 8, 7, 6]); k++) {
				await prisma.toDoItem.create({
					data: {
						name: "Test",
						checked: chance.weighted([true, false], [1, 2]),
						project: {
							connect: {
								id: project.id
							}
						},
						assignees: {
							create: chance.pickset(users, chance.natural({ min: 0, max: users.length - 1 }))
								.map(user => ({
									projectUser: {
										connect: {
											id: user.id
										}
									}
								}))
						}
					}
				})
			}
		}
	}

	console.log('Projects seeded!');
}
