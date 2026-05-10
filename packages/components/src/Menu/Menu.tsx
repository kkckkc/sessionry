import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { MenuRoot as BaseMenuRoot } from '@base-ui/react/menu';
import type { ReactNode } from 'react';
import './Menu.css';

const HOVER_CLOSE_REASON = 'trigger-hover';

export interface MenuItemProps {
  /**
   * Menu item content
   */
  children: ReactNode;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Whether the item is disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Whether this is a danger/destructive action
   */
  danger?: boolean;
}

/**
 * MenuItem component for use within Menu.
 *
 * @example
 *
 * ```tsx
 * <Menu.Item onClick={handleRename}>
 *   Rename
 * </Menu.Item>
 * ```
 */
export const MenuItem = ({
  children,
  onClick,
  disabled = false,
  className: customClassName,
  danger = false
}: MenuItemProps) => {
  const baseClassName = ['menu-item', danger && 'menu-item--danger', customClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <BaseMenu.Item className={baseClassName} onClick={onClick} disabled={disabled}>
      {children}
    </BaseMenu.Item>
  );
};

MenuItem.displayName = 'MenuItem';

export interface MenuRootProps {
  /**
   * Whether the menu is open
   */
  open?: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean, eventDetails: BaseMenuRoot.ChangeEventDetails) => void;

  /**
   * Menu content
   */
  children: ReactNode;
}

/**
 * MenuRoot component - the root container for a menu.
 *
 * @example
 *
 * ```tsx
 * <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
 *   {children}
 * </Menu.Root>
 * ```
 */
export const MenuRoot = ({ open, onOpenChange, children }: MenuRootProps) => {
  const handleOpenChange = (nextOpen: boolean, eventDetails: BaseMenuRoot.ChangeEventDetails) => {
    if (!nextOpen && eventDetails.reason === HOVER_CLOSE_REASON) {
      eventDetails.cancel();
      return;
    }

    onOpenChange?.(nextOpen, eventDetails);
  };

  return (
    <BaseMenu.Root open={open} onOpenChange={handleOpenChange} modal={true}>
      {children}
    </BaseMenu.Root>
  );
};

MenuRoot.displayName = 'MenuRoot';

export interface MenuTriggerProps {
  /**
   * Trigger content
   */
  children: ReactNode;

  /**
   * Whether the trigger is disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Button title
   */
  title?: string;
}

/**
 * MenuTrigger component - opens the menu it belongs to.
 */
export const MenuTrigger = ({
  children,
  disabled = false,
  className: customClassName,
  title
}: MenuTriggerProps) => {
  return (
    <BaseMenu.Trigger className={customClassName} disabled={disabled} title={title}>
      {children}
    </BaseMenu.Trigger>
  );
};

MenuTrigger.displayName = 'MenuTrigger';

export interface MenuSubmenuRootProps {
  /**
   * Whether the submenu is open
   */
  open?: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean, eventDetails: BaseMenuRoot.ChangeEventDetails) => void;

  /**
   * Submenu content
   */
  children: ReactNode;
}

/**
 * MenuSubmenuRoot component - the root container for a nested menu.
 */
export const MenuSubmenuRoot = ({ open, onOpenChange, children }: MenuSubmenuRootProps) => {
  return (
    <BaseMenu.SubmenuRoot open={open} onOpenChange={onOpenChange}>
      {children}
    </BaseMenu.SubmenuRoot>
  );
};

MenuSubmenuRoot.displayName = 'MenuSubmenuRoot';

export interface MenuSubmenuTriggerProps {
  /**
   * Trigger content
   */
  children: ReactNode;

  /**
   * Whether the trigger is disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Text label for keyboard navigation
   */
  label?: string;
}

/**
 * MenuSubmenuTrigger component - menu item that opens a nested menu.
 */
export const MenuSubmenuTrigger = ({
  children,
  disabled = false,
  className: customClassName,
  label
}: MenuSubmenuTriggerProps) => {
  const baseClassName = ['menu-item', customClassName].filter(Boolean).join(' ');

  return (
    <BaseMenu.SubmenuTrigger className={baseClassName} disabled={disabled} label={label}>
      {children}
    </BaseMenu.SubmenuTrigger>
  );
};

MenuSubmenuTrigger.displayName = 'MenuSubmenuTrigger';

export interface MenuPortalProps {
  /**
   * Menu portal content
   */
  children: ReactNode;
}

/**
 * MenuPortal component - renders menu content in a portal.
 */
export const MenuPortal = ({ children }: MenuPortalProps) => {
  return <BaseMenu.Portal>{children}</BaseMenu.Portal>;
};

MenuPortal.displayName = 'MenuPortal';

export interface MenuPositionerProps {
  /**
   * Anchor element or virtual element for positioning
   */
  anchor?: { getBoundingClientRect: () => DOMRect };

  /**
   * Menu positioner content
   */
  children: ReactNode;

  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * MenuPositioner component - positions the menu relative to an anchor.
 *
 * @example
 *
 * ```tsx
 * <Menu.Positioner anchor={anchorElement}>
 *   <Menu.Popup>
 *     {items}
 *   </Menu.Popup>
 * </Menu.Positioner>
 * ```
 */
export const MenuPositioner = ({
  anchor,
  children,
  className: customClassName
}: MenuPositionerProps) => {
  const baseClassName = ['menu-positioner', customClassName].filter(Boolean).join(' ');

  return (
    <BaseMenu.Positioner className={baseClassName} anchor={anchor}>
      {children}
    </BaseMenu.Positioner>
  );
};

MenuPositioner.displayName = 'MenuPositioner';

export interface MenuPopupProps {
  /**
   * Menu popup content
   */
  children: ReactNode;

  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * MenuPopup component - the visible menu container.
 *
 * @example
 *
 * ```tsx
 * <Menu.Popup>
 *   <Menu.Item onClick={handleAction}>Action</Menu.Item>
 * </Menu.Popup>
 * ```
 */
export const MenuPopup = ({ children, className: customClassName }: MenuPopupProps) => {
  const baseClassName = ['menu-popup', customClassName].filter(Boolean).join(' ');

  return <BaseMenu.Popup className={baseClassName}>{children}</BaseMenu.Popup>;
};

MenuPopup.displayName = 'MenuPopup';

export interface MenuSeparatorProps {
  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * MenuSeparator component - a visual separator between menu items.
 *
 * @example
 *
 * ```tsx
 * <Menu.Item>Action 1</Menu.Item>
 * <Menu.Separator />
 * <Menu.Item>Action 2</Menu.Item>
 * ```
 */
export const MenuSeparator = ({ className: customClassName }: MenuSeparatorProps) => {
  const baseClassName = ['menu-separator', customClassName].filter(Boolean).join(' ');

  return <BaseMenu.Separator className={baseClassName} />;
};

MenuSeparator.displayName = 'MenuSeparator';

/**
 * Menu component built on Base UI Menu with enhanced accessibility.
 * Provides keyboard navigation, ARIA support, and context menu functionality.
 *
 * @example
 *
 * ```tsx
 * const [menuOpen, setMenuOpen] = useState(false);
 * const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
 *
 * <button
 *   onContextMenu={(e) => {
 *     e.preventDefault();
 *     setAnchorEl(e.currentTarget);
 *     setMenuOpen(true);
 *   }}
 * >
 *   Right-click me
 * </button>
 *
 * <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
 *   <Menu.Portal>
 *     <Menu.Positioner anchor={anchorEl}>
 *       <Menu.Popup>
 *         <Menu.Item onClick={handleEdit}>Edit</Menu.Item>
 *         <Menu.Item onClick={handleDuplicate}>Duplicate</Menu.Item>
 *         <Menu.Separator />
 *         <Menu.Item onClick={handleDelete} danger>Delete</Menu.Item>
 *       </Menu.Popup>
 *     </Menu.Positioner>
 *   </Menu.Portal>
 * </Menu.Root>
 * ```
 */
export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  SubmenuRoot: MenuSubmenuRoot,
  SubmenuTrigger: MenuSubmenuTrigger,
  Portal: MenuPortal,
  Positioner: MenuPositioner,
  Popup: MenuPopup,
  Item: MenuItem,
  Separator: MenuSeparator
};
