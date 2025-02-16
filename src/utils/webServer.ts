import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class WebServer {
    constructor() {
        this.pointSystem();
        this.scheduleNextAssignment(10, this.assignData);
        this.scheduleNextAssignment(27, this.pointSystem);
    }

    private scheduleNextAssignment(day: number, callback: Function) {
        const now = new Date();
        const nextAssignment = new Date(now.getFullYear(), now.getMonth(), day);
        if (now.getDate() > day) {
            nextAssignment.setMonth(nextAssignment.getMonth() + 1);
        }
        const timeUntilNextAssignment = nextAssignment.getTime() - now.getTime();
        setTimeout(() => {
            callback();
            this.scheduleNextAssignment(day, callback);
        }, timeUntilNextAssignment);
    }

    private async assignData() {
        try {
            // Tüm şirketleri ve çalışanlarını getir
            const companies = await prisma.company.findMany({
                include: {
                    workers: true
                }
            });
            const emissions = await prisma.emissionFactor.findMany({
                where: {
                    type: "CALISAN_GIRDILI",
                    scope: "SIRKET"
                }
            });

            const currentDate = new Date();

            for (const company of companies) {
                const workerCount = company.workers.length;
                if (workerCount > 0) {
                    for (const emission of emissions) {
                        await prisma.emission.create({
                            data: {
                                type: emission.type as any,
                                category: emission.category,
                                amount: workerCount,
                                carbonValue: emission.emissionFactor * workerCount,
                                unit: emission.unit,
                                source: "MONTHLY_AUTO",
                                date: currentDate,
                                scope: "SIRKET",
                                companyId: company.id
                            }
                        });
                    }

                    // Şirketin toplam karbon değerini güncelle
                    const totalNewEmissions = emissions.reduce(
                        (sum, emission) => sum + Number(emission.emissionFactor * workerCount),
                        0
                    );
                    await prisma.company.update({
                        where: { id: company.id },
                        data: {
                            totalCarbon: {
                                increment: totalNewEmissions
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error assigning monthly data:", error);
        }
    }

    private async pointSystem() {
        try {
            const companies = await prisma.company.findMany();
            const currentDate = new Date();
            const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
            
            for (const company of companies) {
                const currentMonthEmissions = await prisma.emission.aggregate({
                    where: {
                        companyId: company.id,
                        AND: [
                            {
                                date: {
                                    gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                                }
                            },
                            {
                                date: {
                                    lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                                }
                            }
                        ]
                    },
                    _sum: {
                        carbonValue: true
                    }
                });

                // Geçen ayki emisyonları getir
                const previousMonthEmissions = await prisma.emission.aggregate({
                    where: {
                        companyId: company.id,
                        AND: [
                            {
                                date: {
                                    gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1)
                                }
                            },
                            {
                                date: {
                                    lt: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 1)
                                }
                            }
                        ]
                    },
                    _sum: {
                        carbonValue: true
                    }
                });

                const currentMonthTotal = Number(currentMonthEmissions._sum.carbonValue || 0);
                const previousMonthTotal = Number(previousMonthEmissions._sum.carbonValue || 0);

                let pointsToAdd = 0;

                if (previousMonthTotal > 0) {
                    const changePercentage = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
                    
                    if (changePercentage <= -5) pointsToAdd = 10;
                    else if (changePercentage <= -1) pointsToAdd = 5;
                    else if (changePercentage < 0) pointsToAdd = 2;
                    else if (changePercentage === 0) pointsToAdd = 0;
                    else if (changePercentage <= 1) pointsToAdd = -2;
                    else if (changePercentage <= 5) pointsToAdd = -5;
                    else pointsToAdd = -10;
                }
                // Şirketin puanını güncelle
                // Get current points
                const companyPoints = await prisma.company.findUnique({
                    where: { id: company.id },
                    select: { points: true }
                });

                // Calculate new points total
                const newPoints = (companyPoints?.points || 0) + pointsToAdd;

                // Set points to 0 if would go negative, otherwise add pointsToAdd
                await prisma.company.update({
                    where: { id: company.id },
                    data: {
                        points: newPoints < 0 ? 0 : newPoints
                    }
                });
            }
        } catch (error) {
            console.error("Error in point system:", error);
        }
    }
}

