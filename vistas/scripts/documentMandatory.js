
$(document).ready(function () {
    // Inicializar select2 para mejorar la experiencia de usuario
    $('#company_id, #position_id').select2({
        placeholder: 'Seleccione una opción',
        allowClear: true
    });

    // Cargar la lista de empresas al cargar la página
    cargarEmpresas();

    // Evento al seleccionar una empresa
    $('#company_id').on('select2:select', function () {
        const company_id = $(this).val();
        if (company_id) {
            cargarPuestos(company_id);
            $('#position_id').val(null).trigger('change');  // Limpiar el select de puestos
            $('#document-list').empty();  // Limpiar la lista de documentos
        }
    });

    // Evento al seleccionar un puesto
    $('#position_id').on('select2:select', function () {
        const position_id = $(this).val();
        if (position_id) {
            cargarDocumentos(position_id);  // Cargar los documentos del puesto seleccionado
        }
    });

    // Función para cargar empresas
    function cargarEmpresas() {
        $.ajax({
            url: '../controlador/DocumentMandatoryController.php?op=selectCompanies',
            method: 'GET',
            success: function (data) {
                $('#company_id').html('<option value="">Seleccione una empresa</option>' + data);  // Llenar el select con empresas
            },
            error: function (xhr, status, error) {
                mostrarError("Error al cargar las empresas");
            }
        });
    }

    // Función para cargar los puestos de la empresa seleccionada
    function cargarPuestos(company_id) {
        $('#position_id').empty();  // Limpiar el select de puestos

        $.ajax({
            url: '../controlador/DocumentMandatoryController.php?op=selectJobPositionsByCompany',
            method: 'POST',
            data: { company_id: company_id },
            success: function (data) {
                $('#position_id').html('<option value="">Seleccione un puesto</option>' + data);  // Llenar el select de puestos
            },
            error: function (xhr, status, error) {
                mostrarError("Error al cargar los puestos");
            }
        });
    }

    // Función para cargar los documentos del puesto seleccionado
    function cargarDocumentos(position_id) {
        $('#document-list').empty();  // Limpiar la lista de documentos

        $.ajax({
            url: '../controlador/DocumentMandatoryController.php?op=listarDocumentosAsignados',
            method: 'POST',
            data: { position_id: position_id },
            success: function (response) {
                const documentos = JSON.parse(response);
                renderizarDocumentos(documentos);
                mostrarExito("Documentos cargados exitosamente.");
            },
            error: function (xhr, status, error) {
                mostrarError("Error al cargar los documentos asignados.");
            }
        });
    }

    // Función para renderizar los documentos en la interfaz
    function renderizarDocumentos(documentos) {
        let documentList = $('#document-list');
        documentList.empty();

        documentos.forEach(function (doc) {
            let radioGroupName = `tipo_doc_${doc.document_id}`;

            let docHtml = `
                <div class="form-group row">
                    <div class="col-sm-8">
                        <div class="form-check">
                            <label class="custom-control custom-checkbox">
                                <input type="checkbox" class="custom-control-input documento-checkbox" data-id="${doc.document_id}" ${doc.asignado ? 'checked' : ''}>
                                <span class="custom-control-indicator"></span>
                                <span class="custom-control-description">${doc.documentName}</span>
                            </label>
                        </div>
                    </div>
                    <div class="col-sm-2">
                        <div class="form-check">
                            <label class="custom-control custom-radio">
                                <input name="${radioGroupName}" value="obligatorio" class="custom-control-input" type="radio" ${doc.document_type === 'obligatorio' ? 'checked' : ''} ${!doc.asignado ? 'disabled' : ''}>
                                <span class="custom-control-indicator"></span>
                                <span class="custom-control-description">Obligatorio</span>
                            </label>
                        </div>
                    </div>
                    <div class="col-sm-2">
                        <div class="form-check">
                            <label class="custom-control custom-radio">
                                <input name="${radioGroupName}" value="opcional" class="custom-control-input" type="radio" ${doc.document_type === 'opcional' ? 'checked' : ''} ${!doc.asignado ? 'disabled' : ''}>
                                <span class="custom-control-indicator"></span>
                                <span class="custom-control-description">Opcional</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
            documentList.append(docHtml);
        });

        // Habilitar/deshabilitar radios según el checkbox
        $('.documento-checkbox').change(function () {
            const docId = $(this).data('id');
            const isChecked = $(this).is(':checked');
            $(`input[name="tipo_doc_${docId}"]`).prop('disabled', !isChecked);

            if (!isChecked) {
                $(`input[name="tipo_doc_${docId}"]`).prop('checked', false);
            }
        });
    }

    // Manejo del envío del formulario
    $('#formAsignarDocumentos').on('submit', function (e) {
        e.preventDefault();

        const position_id = $('#position_id').val();
        const documentosSeleccionados = [];
        const documentosDesmarcados = [];
        let errorDetected = false;

        $('.documento-checkbox').each(function () {
            const docId = $(this).data('id');
            const isChecked = $(this).is(':checked');
            const document_type = $(`input[name="tipo_doc_${docId}"]:checked`).val();

            if (isChecked) {
                if (!document_type) {
                    mostrarAdvertencia(`Debe seleccionar si el documento "${$(this).siblings('.custom-control-description').text()}" es Obligatorio u Opcional.`);
                    errorDetected = true;
                    return false;
                }

                documentosSeleccionados.push({
                    documentName_id: docId,
                    document_type: document_type
                });
            } else {
                documentosDesmarcados.push({ documentName_id: docId });
            }
        });

        if (errorDetected) {
            return;  // No enviar el formulario si hay errores
        }

        $.ajax({
            url: '../controlador/DocumentMandatoryController.php?op=guardarAsignacion',
            method: 'POST',
            data: {
                position_id: position_id,
                documentosSeleccionados: JSON.stringify(documentosSeleccionados),
                documentosDesmarcados: JSON.stringify(documentosDesmarcados)
            },
            success: function (response) {
                mostrarExito("Asignación guardada exitosamente.");
                cargarDocumentos(position_id);
            },
            error: function (xhr, status, error) {
                mostrarError("Error al guardar la asignación.");
            }
        });
    });

    // Función para cancelar y limpiar el formulario
    $('#btnCancelar').click(function () {
        // Limpiar las selecciones y la lista de documentos
        $('#company_id').val(null).trigger('change');
        $('#position_id').val(null).trigger('change');
        $('#document-list').empty();
    
        // Mostrar el Toastify de asignación cancelada
        Toastify({
            text: "Asignación cancelada.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#ffc107",  // Amarillo para advertencias/cancelaciones
            
            className: "toast-progress",
        }).showToast();
    });

    // Funciones auxiliares para notificaciones
    function mostrarError(mensaje) {
        Toastify({
            text: mensaje,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#dc3545",  // Rojo para errores
            
            className: "toast-progress",
        }).showToast();
    }

    function mostrarExito(mensaje) {
        Toastify({
            text: mensaje,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#28a745",  // Verde para éxito
            
            className: "toast-progress",

        }).showToast();
    }

    function mostrarAdvertencia(mensaje) {
        Toastify({
            text: mensaje,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#ffc107",  // Amarillo para advertencias
            className: "toast-progress",
        }).showToast();
    }
});
