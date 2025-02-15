import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class WebServer {
    constructor() {
        this.scheduleNextAssignment();
        this.assignData();
    }

    private scheduleNextAssignment() {
        const now = new Date();
        const nextAssignment = new Date(now.getFullYear(), now.getMonth(), 10);
        
        // Eğer ayın 10'u geçtiyse, bir sonraki ayın 10'unu hedefle
        if (now.getDate() > 10) {
            nextAssignment.setMonth(nextAssignment.getMonth() + 1);
        }

        const timeUntilNextAssignment = nextAssignment.getTime() - now.getTime();
        setTimeout(() => {
            this.assignData();
            this.scheduleNextAssignment(); // Bir sonraki ay için planla
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
                console.log(totalNewEmissions);
                await prisma.company.update({
                    where: { id: company.id },
                    data: {
                        totalCarbon: {
                            increment: totalNewEmissions
                        }
                    }
                });

                console.log(`Assigned monthly emissions for company ${company.id} with ${workerCount} workers`);
            }
        } catch (error) {
            console.error("Error assigning monthly data:", error);
        }
    }
}
