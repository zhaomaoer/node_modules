# This file is generated by gyp; do not edit.

TOOLSET := target
TARGET := magic
DEFS_Debug := \
	'-DNODE_GYP_MODULE_NAME=magic' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DLINK_SIZE=2' \
	'-DPCRE_STATIC' \
	'-DBUILDING_NODE_EXTENSION' \
	'-DDEBUG' \
	'-D_DEBUG'

# Flags passed to all source files.
CFLAGS_Debug := \
	-O3 \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-g \
	-O0

# Flags passed to only C files.
CFLAGS_C_Debug := \
	-O3

# Flags passed to only C++ files.
CFLAGS_CC_Debug := \
	-O3 \
	-fno-rtti \
	-fno-exceptions

INCS_Debug := \
	-I/root/.node-gyp/0.12.7/src \
	-I/root/.node-gyp/0.12.7/deps/uv/include \
	-I/root/.node-gyp/0.12.7/deps/v8/include \
	-I$(srcdir)/deps/libmagic/src \
	-I$(srcdir)/node_modules/nan \
	-I$(srcdir)/deps/libmagic/pcre

DEFS_Release := \
	'-DNODE_GYP_MODULE_NAME=magic' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DLINK_SIZE=2' \
	'-DPCRE_STATIC' \
	'-DBUILDING_NODE_EXTENSION'

# Flags passed to all source files.
CFLAGS_Release := \
	-O3 \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-O3 \
	-ffunction-sections \
	-fdata-sections \
	-fno-tree-vrp \
	-fno-omit-frame-pointer

# Flags passed to only C files.
CFLAGS_C_Release := \
	-O3

# Flags passed to only C++ files.
CFLAGS_CC_Release := \
	-O3 \
	-fno-rtti \
	-fno-exceptions

INCS_Release := \
	-I/root/.node-gyp/0.12.7/src \
	-I/root/.node-gyp/0.12.7/deps/uv/include \
	-I/root/.node-gyp/0.12.7/deps/v8/include \
	-I$(srcdir)/deps/libmagic/src \
	-I$(srcdir)/node_modules/nan \
	-I$(srcdir)/deps/libmagic/pcre

OBJS := \
	$(obj).target/$(TARGET)/src/binding.o

# Add to the list of files we specially track dependencies for.
all_deps += $(OBJS)

# Make sure our dependencies are built before any of us.
$(OBJS): | $(builddir)/magic.a $(builddir)/pcre.a $(obj).target/deps/libmagic/magic.a $(obj).target/deps/libmagic/pcre/pcre.a

# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual.
$(OBJS): TOOLSET := $(TOOLSET)
$(OBJS): GYP_CFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE))
$(OBJS): GYP_CXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE))

# Suffix rules, putting all outputs into $(obj).

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# End of this set of suffix rules
### Rules for final target.
LDFLAGS_Debug := \
	-pthread \
	-rdynamic \
	-m64

LDFLAGS_Release := \
	-pthread \
	-rdynamic \
	-m64

LIBS :=

$(obj).target/magic.node: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
$(obj).target/magic.node: LIBS := $(LIBS)
$(obj).target/magic.node: TOOLSET := $(TOOLSET)
$(obj).target/magic.node: $(OBJS) $(obj).target/deps/libmagic/magic.a $(obj).target/deps/libmagic/pcre/pcre.a FORCE_DO_CMD
	$(call do_cmd,solink_module)

all_deps += $(obj).target/magic.node
# Add target alias
.PHONY: magic
magic: $(builddir)/magic.node

# Copy this to the executable output path.
$(builddir)/magic.node: TOOLSET := $(TOOLSET)
$(builddir)/magic.node: $(obj).target/magic.node FORCE_DO_CMD
	$(call do_cmd,copy)

all_deps += $(builddir)/magic.node
# Short alias for building this executable.
.PHONY: magic.node
magic.node: $(obj).target/magic.node $(builddir)/magic.node

# Add executable to "all" target.
.PHONY: all
all: $(builddir)/magic.node

