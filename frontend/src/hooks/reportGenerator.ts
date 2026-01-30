import { Processo, formatStatus } from "../pages/Processos";
import jsPDF from "jspdf";
import autoTable, { HookData } from "jspdf-autotable";

// *** IMPORTAÇÃO CERTA PARA VITE + REACT + BROWSER ***
import * as XLSX from "xlsx/dist/xlsx.full.min.js";

export const generateProcessosExcel = (
  processos: Processo[],
  title: string
) => {
  // 1. Cabeçalho do Relatório
  const reportHeader = [
    [title],
    ["LAND Serviços e Engenharia Ltda"],
    [
      `Relatório gerado em: ${new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`,
    ],
    [], // Linha em branco para espaçamento
  ];

  // 2. Cabeçalho da Tabela de Dados
  const tableHeader = [
    "CRDII",
    "PROCESSOS",
    "USUÁRIO",
    "DATA CRIAÇÃO",
    "DATA STATUS",
    "STATUS",
  ];

  // 3. Linhas da Tabela de Dados
  const tableRows = processos.map((processo) => [
    processo.crdii_nome || "N/A",
    processo.nome,
    processo.criado_por,
    new Date(processo.data_criacao).toLocaleDateString("pt-BR"),
    new Date(processo.data_status).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    formatStatus(processo.status),
  ]);

  // 4. Combina tudo em um único array de dados
  const fullData = [...reportHeader, tableHeader, ...tableRows];

  // 5. Cria a planilha a partir do array de arrays
  const worksheet = XLSX.utils.aoa_to_sheet(fullData);

  // 6. Define a mesclagem para as células do cabeçalho
  worksheet["!merges"] = [
    // Mescla A1:F1 para o título
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    // Mescla A2:F2 para o nome da empresa
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    // Mescla A3:F3 para a data
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
  ];

  // 7. Define a largura das colunas
  worksheet["!cols"] = [
    { wch: 20 }, // CRDII
    { wch: 40 }, // PROCESSOS
    { wch: 20 }, // USUÁRIO
    { wch: 15 }, // DATA CRIAÇÃO
    { wch: 20 }, // DATA STATUS
    { wch: 15 }, // STATUS
  ];

  // 8. Cria o workbook e faz o download
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");

  XLSX.writeFile(
    workbook,
    `${title.replace(/ /g, "_").toLowerCase()}_report.xlsx`
  );
};

export const generateProcessosPDF = (
  processos: Processo[],
  title: string,
  logo: string
) => {
  const doc = new jsPDF();
  const tableColumn = [
    "CRDII",
    "PROCESSOS",
    "USUÁRIO",
    "DATA CRIAÇÃO",
    "DATA STATUS",
    "STATUS",
  ];
  const tableRows: (string | number)[][] = [];

  processos.forEach((processo) => {
    const processoData = [
      processo.crdii_nome || "N/A",
      processo.nome,
      processo.criado_por,
      new Date(processo.data_criacao).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      new Date(processo.data_status).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      formatStatus(processo.status),
    ];
    tableRows.push(processoData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    didDrawPage: (data: HookData) => {
      const pageWidth = doc.internal.pageSize.width;
      const margin = data.settings.margin.left;

      // Logo
      const logoWidth = 25;
      const logoHeight = 25;
      doc.addImage(logo, "PNG", margin, 15, logoWidth, logoHeight);

      // Empresa
      doc.setFontSize(8);
      doc.setTextColor("#6c757d");
      doc.text("LAND Serviços e Engenharia Ltda", pageWidth - margin, 34, {
        align: "right",
      });

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#4F7951FF");
      doc.text(title, pageWidth - margin, 22, { align: "right" });

      // Data
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#464A4EFF");
      doc.text(
        `Relatório gerado em: ${new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`,
        pageWidth - margin,
        28,
        { align: "right" }
      );

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    },
    margin: { top: 45 },
  });

  doc.save(`${title.replace(/ /g, "_").toLowerCase()}_report.pdf`);
};
