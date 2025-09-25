import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseModalOptions {
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Callback when modal state changes */
  onStateChange?: (isOpen: boolean) => void;
  /** Auto-close after specified time (ms) */
  autoCloseDelay?: number;
  /** Prevent closing when clicking outside */
  preventOutsideClose?: boolean;
  /** Prevent closing with escape key */
  preventEscapeClose?: boolean;
}

export interface UseModalReturn {
  /** Whether modal is open */
  isOpen: boolean;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: () => void;
  /** Toggle modal state */
  toggle: () => void;
  /** Set modal state directly */
  setOpen: (open: boolean) => void;
  /** Modal props to spread on modal component */
  modalProps: {
    open: boolean;
    onCancel: () => void;
    onOk?: () => void;
  };
}

/**
 * Custom hook for managing modal state
 * Provides reusable modal state logic with open, close, and toggle functionality
 */
export const useModal = ({
  defaultOpen = false,
  onOpen,
  onClose,
  onStateChange,
  autoCloseDelay,
  preventOutsideClose = false,
  preventEscapeClose = false,
}: UseModalOptions = {}): UseModalReturn => {
  const [isOpen, setIsOpenState] = useState(defaultOpen);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOpenRef = useRef(isOpen);

  // Keep ref in sync with state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  /**
   * Clear auto-close timer
   */
  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  /**
   * Set auto-close timer
   */
  const setAutoCloseTimer = useCallback(() => {
    if (autoCloseDelay && autoCloseDelay > 0) {
      clearAutoCloseTimer();
      autoCloseTimerRef.current = setTimeout(() => {
        if (isOpenRef.current) {
          setIsOpenState(false);
          onClose?.();
          onStateChange?.(false);
        }
      }, autoCloseDelay);
    }
  }, [autoCloseDelay, clearAutoCloseTimer, onClose, onStateChange]);

  /**
   * Internal function to update modal state
   */
  const setOpen = useCallback(
    (open: boolean) => {
      if (open === isOpenRef.current) {
        return; // No change needed
      }

      setIsOpenState(open);

      if (open) {
        onOpen?.();
        setAutoCloseTimer();
      } else {
        onClose?.();
        clearAutoCloseTimer();
      }

      onStateChange?.(open);
    },
    [onOpen, onClose, onStateChange, setAutoCloseTimer, clearAutoCloseTimer]
  );

  /**
   * Open the modal
   */
  const open = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  /**
   * Close the modal
   */
  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  /**
   * Toggle modal state
   */
  const toggle = useCallback(() => {
    setOpen(!isOpenRef.current);
  }, [setOpen]);

  /**
   * Handle modal cancel (close)
   */
  const handleCancel = useCallback(() => {
    if (!preventOutsideClose) {
      close();
    }
  }, [close, preventOutsideClose]);

  /**
   * Handle modal OK (close)
   */
  const handleOk = useCallback(() => {
    close();
  }, [close]);

  // Handle escape key
  useEffect(() => {
    if (!preventEscapeClose && isOpen) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          close();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
    return undefined;
  }, [isOpen, close, preventEscapeClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearAutoCloseTimer();
    };
  }, [clearAutoCloseTimer]);

  // Modal props for easy spreading
  const modalProps = {
    open: isOpen,
    onCancel: handleCancel,
    onOk: handleOk,
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen,
    modalProps,
  };
};

export default useModal;

/**
 * Hook for managing multiple modals
 * Useful when you need to manage several modals in the same component
 */
export interface UseMultiModalOptions {
  /** Modal configurations */
  modals: Record<string, UseModalOptions>;
}

export interface UseMultiModalReturn {
  /** Modal states */
  modals: Record<string, UseModalReturn>;
  /** Open specific modal */
  openModal: (modalId: string) => void;
  /** Close specific modal */
  closeModal: (modalId: string) => void;
  /** Close all modals */
  closeAllModals: () => void;
  /** Check if any modal is open */
  hasOpenModal: boolean;
  /** Get list of open modal IDs */
  openModalIds: string[];
}

/**
 * Custom hook for managing multiple modals
 * Provides state management for multiple modals with centralized control
 */
export const useMultiModal = ({
  modals: modalConfigs,
}: UseMultiModalOptions): UseMultiModalReturn => {
  // Create individual modal hooks
  const modals: Record<string, UseModalReturn> = {};

  Object.keys(modalConfigs).forEach(modalId => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    modals[modalId] = useModal(modalConfigs[modalId]);
  });

  /**
   * Open specific modal
   */
  const openModal = useCallback(
    (modalId: string) => {
      if (modals[modalId]) {
        modals[modalId].open();
      }
    },
    [modals]
  );

  /**
   * Close specific modal
   */
  const closeModal = useCallback(
    (modalId: string) => {
      if (modals[modalId]) {
        modals[modalId].close();
      }
    },
    [modals]
  );

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    Object.values(modals).forEach(modal => {
      modal.close();
    });
  }, [modals]);

  // Computed values
  const openModalIds = Object.keys(modals).filter(
    modalId => modals[modalId]?.isOpen
  );
  const hasOpenModal = openModalIds.length > 0;

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    hasOpenModal,
    openModalIds,
  };
};

/**
 * Hook for managing modal with confirmation
 * Useful for modals that need user confirmation before closing
 */
export interface UseConfirmModalOptions extends UseModalOptions {
  /** Confirmation message */
  confirmMessage?: string;
  /** Callback when user confirms */
  onConfirm?: () => void | Promise<void>;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Show confirmation when closing */
  requireConfirmation?: boolean;
}

export interface UseConfirmModalReturn extends UseModalReturn {
  /** Confirm and close modal */
  confirm: () => Promise<void>;
  /** Cancel without confirmation */
  cancel: () => void;
  /** Whether confirmation is pending */
  isConfirming: boolean;
}

/**
 * Custom hook for managing modal with confirmation
 * Provides confirmation logic before closing modal
 */
export const useConfirmModal = ({
  confirmMessage = 'Are you sure?',
  onConfirm,
  onCancel,
  requireConfirmation = true,
  ...modalOptions
}: UseConfirmModalOptions = {}): UseConfirmModalReturn => {
  const [isConfirming, setIsConfirming] = useState(false);
  const modal = useModal(modalOptions);

  /**
   * Handle confirmation
   */
  const confirm = useCallback(async () => {
    try {
      setIsConfirming(true);

      if (onConfirm) {
        await onConfirm();
      }

      modal.close();
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirm, modal]);

  /**
   * Handle cancellation
   */
  const cancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    modal.close();
  }, [onCancel, modal]);

  /**
   * Override close to show confirmation if required
   */
  const close = useCallback(() => {
    if (requireConfirmation && modal.isOpen) {
      // Show confirmation dialog (implementation depends on your UI library)
      if (window.confirm(confirmMessage)) {
        confirm();
      }
    } else {
      modal.close();
    }
  }, [requireConfirmation, modal, confirmMessage, confirm]);

  return {
    ...modal,
    close,
    confirm,
    cancel,
    isConfirming,
  };
};
